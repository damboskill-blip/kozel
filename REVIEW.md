# REVIEW

Дата: 2026-05-14
Ветка: `claude/install-superpowers-skills-MEAKF`
Коммит: `5378c6f`

Свод результатов трёх параллельных Explore-ревьюеров (движок, сервер/транспорт/БД, web UI). Ниже — только находки; кода не правил.

Severity: **BLOCKER** (ломает игру / теряются данные / уязвимость), **MAJOR** (ощутимый баг, неверное поведение, плохой UX на iPhone), **MINOR** (реальный недочёт, но редкий / косметика смысловая).

---

## Сводка

| Зона        | Blocker | Major | Minor | Всего |
|-------------|--------:|------:|------:|------:|
| Движок      |       0 |     2 |     1 |     3 |
| Сервер/БД   |       2 |     5 |     3 |    10 |
| Web UI/UX   |       1 |     7 |     8 |    16 |
| **Итого**   |   **3** |**14** | **12**| **29**|

Главные риски перед игрой:
1. **Сервер `lobby.ts`** не подгружает места из БД при join → реконнект ломает места.
2. **`repo-matches.ts`** недатомарная нумерация `seq` для match-events → потеря истории при конкуренции.
3. **`lockedFromBeating`** переносится через переоткрытия extra-round — игрок, скинувший face-down в обычном `follow`, навсегда заблокирован, даже когда правило #3 говорит «можно бить заново».
4. **Web** не показывает состояния `sdacha-end` / `between-tricks` явно — игрок не понимает, что происходит.
5. **iPhone safe-area** в нескольких местах: чат-кнопка, чат-оверлей, intercept-banner, bottom bar.

---

## 1. Игровая логика / движок (`apps/server/src/engine/*`)

### [MAJOR] `apps/server/src/engine/index.ts:307-311`
При переоткрытии extra-round (после extra-beat) старый `lockedFromBeating` тянется как есть через `...trick`. Игроки, которые face-down скинули в обычном `follow`, остаются залоченными навсегда — даже когда правило #3 говорит «круг открывается заново, кто может — пусть бьёт».
**Направление фикса**: либо сбрасывать `lockedFromBeating` в `[]` при переоткрытии, либо переосмыслить семантику lock (только для скидов в самом extra-round, не в follow).

> **Замечание ревьюера от меня**: ревьюер интерпретирует item #3 как «локед должны разлочиваться». Мы с тобой решали наоборот: «locked-from-beating остаётся за теми, кто скинул face-down в `follow`; auto-skid в extra-beat НЕ локает». Возможно это правильное поведение, но ревьюер увидел противоречие в правилах. Стоит решить продуктово: должен ли скинувший в follow получить второй шанс при перезапуске круга?

### [MAJOR] `apps/server/src/engine/index.ts:256`
Тот же корень что выше: `if (trick.lockedFromBeating.includes(action.by))` — проверка `extra-beat`, и она блокирует тех, кто залочен с follow, навсегда.
**Направление фикса**: см. выше.

### [MINOR] `apps/server/src/engine/index.ts:324-329`
При закрытии трюка через extra-beat (`!opened.open`) возвращается `currentTrick.extraRound: { asked: [], nextToAsk: action.by }` — устаревшие данные, в фазе `between-tricks` никто их не читает. Не баг, но грязь.
**Направление фикса**: занулять `extraRound` или комментарием объяснить почему оставлено.

### [OBSERVATION] `apps/server/src/engine/index.ts:287`
Auto-skid использует `Math.min(N, h.length)` — если у одного из не-бьющих рука короче N, его руку «съест» неравномерно (например, `[5, 2, 4]` при N=3 → `[2, 0, 1]`). Игра не виснет (пустая рука auto-pass), но баланс рук расходится.
**Направление фикса**: либо `skidCount = min(N, минимум_среди_остальных)`, либо задокументировать tradeoff.

### Проверены и помечены как корректные
- `compare.ts:16` — `beats(joker, joker)` всегда true (что значит последний кладёт сверху). Тест `pairing.test.ts:107` подтверждает.
- `intercept.ts:5-16` — джокеры считаются как wildcards правильно.
- `trump-change.ts:3-22` — смена козыря только в `draw-cards`, не посреди трюка.
- `extra-round.ts:47-53` — `openExtraRound` корректно гейтит на `leadCount >= 4` и auto-pass пустых рук.

---

## 2. Сервер / транспорт / БД (`apps/server/src/server/*`, `lifecycle/*`, `db/*`)

### [BLOCKER] `apps/server/src/server/handlers/lobby.ts:86`
`handleJoinRoom` для комнаты, загруженной из БД, создаёт in-memory `Room` с `emptySeats()`, но **никогда не подгружает места из таблицы `match_seats`**. Реконнектящийся игрок не найдёт своё место, данные о seat (playerId, name, ready) теряются. На Render free после спин-дауна и пробуждения — это критично.
**Направление фикса**: после создания Room вызвать `getSeats(db, dbMatch.id)` и заполнить `seats` до регистрации.

### [BLOCKER] `apps/server/src/db/repo-matches.ts:109-112`
`appendMatchEvent` делает неатомарный read-then-write: `SELECT MAX(seq)` → INSERT с вычисленным seq. Два конкурентных action'а могут вычислить один и тот же seq, дубликаты или потеря событий. Row-level lock SQLite между statement'ами не защищает.
**Направление фикса**: `db.transaction()` или один `INSERT ... SELECT MAX(seq)+1 ...`.

### [MAJOR] `apps/server/src/server/handlers/action.ts:41-45`
Когда action переводит фазу из `intercept-window` в другую, `scheduleTurnTimer` вызывается, но **не сбрасывает `interceptTimer`**. Если интерсепт-таймер сработает позже, он попытается отыграть `intercept-window-expired` на не-intercept фазе. Сейчас защита есть в `maybeOpenInterceptWindow`, но таймер всё равно пишет в БД.
**Направление фикса**: в `scheduleTurnTimer` добавить `clearInterceptTimer(room)` в начале (как уже сделано для `clearTurnTimer`).

### [MAJOR] `apps/server/src/lifecycle/room.ts:36-56`
`RoomRegistry.unregister()` определён, но **никогда не вызывается**. Завершённые комнаты остаются в памяти. На долго-живущем инстансе Render это утечка. На free tier перезапуск спасает, но всё равно — bug-prone.
**Направление фикса**: вызывать `registry.unregister(matchId)` в `auto-turn.ts` когда `room.status === 'finished'`.

### [MAJOR] `apps/server/src/lifecycle/auto-turn.ts:127-129, 171-173`
Когда `forceEndStuckSdacha` или `autoAdvanceBetweenTricks` завершают матч (`room.status = 'finished'`), новый turnTimer не планируется, но и старый явно не чистится. Висящий callback может сработать на освобождённой комнате.
**Направление фикса**: явно `clearTurnTimer` при финализации, либо сразу `unregister`.

### [MAJOR] `apps/server/src/server/handlers/intercept.ts:12-31`
`handleClaimIntercept` не проверяет, что игрок есть в `phase.eligible`. Движок проверяет, но если бы было обходное (через прямой engine-вызов) — bypass. Также `claim-intercept` принимается в любой фазе; только движок отдаёт error.
**Направление фикса**: серверная валидация `phase.kind === 'intercept-window' && phase.eligible.includes(seat.seat)` до вызова engine.

### [MAJOR] `apps/server/src/server/handlers/action.ts:9-48`
`handleAction` асинхронный с `await dynamic imports`. Между валидацией (строки 14-21) и вызовом движка (строка 24) есть окно, где состояние комнаты может измениться (например, disconnect+rejoin). Race.
**Направление фикса**: минимизировать async-span или валидировать room/seat ещё раз после import.

### [MINOR] `apps/server/src/chat/throttle.ts:6-25`
`ChatThrottle` накапливает бакеты для всех когда-либо чатившихся игроков, без TTL. После долгой жизни инстанса — рост памяти. Действия (action spam) вообще не rate-limit'ятся.
**Направление фикса**: периодический cleanup инактивных бакетов + rate-limit на action.

### [MINOR] `apps/server/src/server/handlers/action.ts:24-32`
Если движок вернул `!ok`, error возвращается, но `updateMatchState` не зовётся → in-memory и DB могут разойтись при retry клиента после реконнекта.
**Направление фикса**: логировать отказ в `match_events` или ранний reject до движка для чистого audit-trail.

### [MINOR] `apps/server/src/reconnect/token.ts:3-4`
Reconnect-токен хранится SHA256-захешированным. Регулярка `/^[0-9a-f]{64}$/` проверяет hex-формат, но не гарантирует что транспорт всегда HTTPS — если что-то логирует raw token, утечка.
**Направление фикса**: проверить что socket.io / Fastify CORS принудительно `secure: true`, токены не попадают в URL/логи.

---

## 3. Web / UI / UX (`apps/web/src/*`)

### [BLOCKER] `apps/web/src/screens/TableScreen.tsx:61-64, 100-110`
`isMyTurn` не учитывает `sdacha-end` и `between-tricks`. Когда сервер переходит в эти фазы, кнопки выглядят disabled без объяснения. На медленных сетях UX тупиковый — игрок не понимает, ждать сервер, готовится следующая сдача или нужно действие.
**Направление фикса**: фразовый баннер: «Сдача завершена», «Ожидаем следующей сдачи…», «Ход [имя]».

### [MAJOR] `apps/web/src/screens/TableScreen.module.css:153`
Кнопка чата 40×40px. Apple HIG минимум — 44×44px. Особенно неудобно крупными пальцами или в landscape.
**Направление фикса**: `width: 44px; height: 44px;` или `min-width: 44px; min-height: 44px;`.

### [MAJOR] `apps/web/src/screens/TableScreen.module.css:165-180`
Чат-оверлей `align-items: flex-end` без safe-area inset. На iPhone с home-indicator (`env(safe-area-inset-bottom) = 34px`) input закрыт системной полоской. Виртуальная клавиатура iOS дополнительно перекрывает.
**Направление фикса**: `padding-bottom: max(12px, env(safe-area-inset-bottom));` на `.chatBox`; рассмотреть `visualViewport` API для подстройки под клавиатуру.

### [MAJOR] `apps/web/src/screens/TableScreen.tsx:166-168`
Карты в руке `interactive={isMyTurn}` — когда не твой ход, нет cursor:pointer и визуального feedback, но и нет явного индикатора «ход [имя]». В сочетании с тяжёлым перекрытием (margin-right: -34px на 375px) — игрок не понимает что происходит и не видит свои карты разборчиво.
**Направление фикса**: (1) баннер «Ход: [имя]» вверху или подсветка аватара; (2) меньший размер карт на узких экранах, либо tap-to-preview.

### [MAJOR] `apps/web/src/styles/global.css:27-31` + `reset.css:3`
`#root` использует одновременно `height: 100%` (legacy) и `height: 100dvh` (modern). iOS Safari при появлении клавиатуры может вызвать overflow и клиппинг нижней панели. Bottom bar `padding: 8px 8px 12px` без safe-area.
**Направление фикса**: `min-height: 100dvh` вместо `height: 100dvh`; `padding-bottom: max(12px, env(safe-area-inset-bottom))` на `.bottomBar`.

### [MAJOR] `apps/web/src/components/ChatPanel.module.css` + `TableScreen.tsx:206-211`
Input чата ~32px высотой при `padding: 6px 8px` + наследуемый шрифт 14px. iOS виртуальная клавиатура перекрывает — нет `keyboard-inset-height` или `scrollIntoView` на focus.
**Направление фикса**: на `onFocus` — `scrollIntoView({ block: 'center' })`, либо подписаться на `visualViewport.resize`.

### [MAJOR] `apps/web/src/components/Card.module.css:49-51`
Selected card `transform: translateY(-16px)` без `z-index` и без зазора в `.handArea`. На узком viewport карта клиппится в зону трюка сверху.
**Направление фикса**: `z-index: 10` на `.selected`, `gap`/`padding-top` на `.handArea`.

### [MAJOR] `apps/web/src/components/Hand.module.css:12-14`
На `max-width: 380px` (iPhone SE и подобные) overlap карт = `-42px`. Масти и ранги в 6 картах почти не видны без тапа.
**Направление фикса**: уменьшить размер карт на узких экранах (`size='small'`) или горизонтальный скролл вместо стопки.

### [MINOR] `apps/web/src/socket/SocketProvider.tsx` + `App.tsx`
Сокет-`connected` определён, но в UI не используется. Строка i18n `connectionLost: 'Связь потеряна. Переподключение…'` есть, но не рендерится. На флэйковой мобильной связи игрок не видит разницы между «связь упала» и «сервер тормозит».
**Направление фикса**: тост/баннер при `!connected` или таймауте action.

### [MINOR] `apps/web/src/components/InterceptBanner.tsx` + `InterceptBanner.module.css`
Баннер интерсепта `top: 16px` без safe-area-inset-top. На iPhone 14+ с Dynamic Island может пересекаться. Высота кнопки не ≥44px, нет визуального urgency (не красный, не пульсирует).
**Направление фикса**: `top: max(16px, env(safe-area-inset-top) + 8px)`, `min-height: 44px`, цветовая подсветка обратного отсчёта.

### [MINOR] `apps/web/src/screens/IdentityScreen.module.css` + `LobbyScreen.module.css`
Inputs с фиксированной шириной 260px не уважают safe-area; в landscape могут уйти за край. Error-текст только цветом — низкий контраст в light mode (если когда-то появится).
**Направление фикса**: `width: min(100% - 32px, 260px)`, фон/рамка у error.

### [MINOR] `apps/web/src/screens/TableScreen.tsx:61-71`
`isActiveSeat` вызывается 3 раза в рендере и дублирует логику `isMyTurn`. При добавлении новой фазы (например, `result-announcement`) рискуем рассинхрон.
**Направление фикса**: вынести в утилитную функцию `seatIsActive(state, seat)`.

### [MINOR] `apps/web/src/state/RoomContext.tsx:35-57`
`setSnapshot((s) => ({ ...s, ... }))` принимает state-update без валидации схемы. Если сервер пришлёт битый payload — креш или зависание.
**Направление фикса**: Zod-валидация входящих state-update перед применением.

### [MINOR] `apps/web/src/components/Avatar.module.css:14-16`
`.active` border `var(--accent)` (#f3b73a) + 3px blur. Контраст с белым текстом аватара под вопросом по WCAG AA.
**Направление фикса**: проверить ratio, возможно тёмная рамка вместо box-shadow.

### [MINOR] `apps/web/src/screens/RoomLobbyScreen.module.css:3`
`grid-template-columns: 1fr 1fr` в landscape iPhone SE (667×375) ломается — команды сжимаются и обрезаются.
**Направление фикса**: `@media (max-width: 500px) { .teams { grid-template-columns: 1fr; } }`.

### [MINOR] `apps/web/src/components/PlayedTrick.module.css`
`min-height: 180px` на узких viewport (iPhone SE 480px высоты) выталкивает руку за экран.
**Направление фикса**: `min-height: 120px` + `gap: 4px` на `max-width: 480px`.

---

## Рекомендуемый порядок исправлений

Если будем чинить — предлагаю по убыванию импакта на «играть с друзьями прямо сейчас»:

1. **BLOCKER lobby.ts** — без него реконнект ломается, что критично для Render free (спин-даун).
2. **BLOCKER seq** — потеря событий редкая, но без транзакции жить страшно.
3. **BLOCKER UI sdacha-end/between-tricks** — игрок видит «нечего делать» без объяснения, на медленной сети люди подумают что сломано.
4. **MAJOR engine lockedFromBeating** — решить продуктово (правило #3): локает ли follow-скид в последующих переоткрытиях?
5. **MAJOR safe-area** (chat button + chat sheet + bottom bar + intercept banner) — одна правка `env(safe-area-inset-*)`, закроет несколько пунктов сразу.
6. **MAJOR карты на узком viewport** — снижение размера на мобиле / scrollable.
7. **MAJOR turn-indicator** — баннер «Ход: имя».
8. Остальные MAJOR серверные таймеры/race — после игры, не критично для friendly match.
9. MINOR — на досуге.

---

## Что НЕ нашли (но ожидали)

- Криптографические проблемы в reconnect token (только транспортная гипотеза).
- Engine cheats: спрятать в `cardIds` чужие карты (проверка `isAllInHand` есть).
- Гонки в `freshGameState` — детерминированный через seed.
- Joker-vs-joker некорректность (проверено явно, всё ок).
