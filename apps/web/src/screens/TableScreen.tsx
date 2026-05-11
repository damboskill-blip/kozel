import { useMemo, useState } from 'react';
import type { ProjectedGameState, SeatPresence, SeatIndex, Action } from '@kozel/shared';
import { Hand } from '../components/Hand.js';
import { PlayedTrick } from '../components/PlayedTrick.js';
import { SeatPanel } from '../components/SeatPanel.js';
import { InterceptBanner } from '../components/InterceptBanner.js';
import { ChatPanel } from '../components/ChatPanel.js';
import { Avatar } from '../components/Avatar.js';
import { suitGlyph } from '../lib/card-display.js';
import { ru } from '../lib/i18n.js';
import type { ChatMsg } from '../state/ChatContext.js';
import styles from './TableScreen.module.css';

export type TableScreenProps = {
  state: ProjectedGameState;
  seats: SeatPresence[];
  mySeat: SeatIndex;
  onAction: (a: Action) => void;
  onClaimIntercept: () => void;
  onSendChat: (text: string) => void;
  chatMessages: ChatMsg[];
};

export function TableScreen({ state, seats, mySeat, onAction, onClaimIntercept, onSendChat, chatMessages }: TableScreenProps): JSX.Element {
  const [selected, setSelected] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const myHand = state.hands[mySeat];
  const isMyHandReal = Array.isArray(myHand);
  const myPresence = seats.find((s) => s.seat === mySeat);

  const opponentBySlot = useMemo(() => {
    const buildSlot = (offset: 1 | 2 | 3): {
      seat: SeatIndex; name: string | null; connected: boolean; count: number; isBot: boolean;
    } => {
      const i = ((mySeat + offset) % 4) as SeatIndex;
      const h = state.hands[i];
      const count = Array.isArray(h) ? h.length : h.count;
      const presence = seats.find((s) => s.seat === i);
      return {
        seat: i,
        name: presence?.name ?? null,
        connected: presence?.connected ?? false,
        count,
        isBot: presence?.isBot ?? false,
      };
    };
    return { right: buildSlot(1), top: buildSlot(2), left: buildSlot(3) };
  }, [state, seats, mySeat]);

  const seatNames = useMemo(() => {
    const out: (string | null)[] = [null, null, null, null];
    for (const s of seats) out[s.seat] = s.name;
    return out;
  }, [seats]);

  const toggle = (id: string): void => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const phase = state.phase;
  const isMyTurn =
    (phase.kind === 'lead' && phase.leader === mySeat) ||
    (phase.kind === 'follow' && phase.next === mySeat) ||
    (phase.kind === 'extra-round' && state.currentTrick?.extraRound?.nextToAsk === mySeat);
  const interceptOpen = phase.kind === 'intercept-window';
  const eligibleNow = interceptOpen && phase.eligible.includes(mySeat as SeatIndex);
  const deadlineMs = interceptOpen ? phase.deadlineMs : 0;
  const isActiveSeat = (s: SeatIndex): boolean =>
    (phase.kind === 'lead' && phase.leader === s) ||
    (phase.kind === 'follow' && phase.next === s) ||
    (phase.kind === 'extra-round' && state.currentTrick?.extraRound?.nextToAsk === s);

  const submit = (a: Action): void => {
    onAction(a);
    setSelected([]);
  };

  const myCardCount = isMyHandReal ? (myHand as never[]).length : 0;
  const stockCount = state.stock.length;

  type ActionBtn = { label: string; kind: 'primary' | 'secondary'; disabled: boolean; onClick: () => void };
  const buttons: ActionBtn[] = [];
  if (phase.kind === 'lead' && phase.leader === mySeat) {
    buttons.push({
      label: 'Ход', kind: 'primary',
      disabled: selected.length === 0,
      onClick: () => submit({ kind: 'lead', by: mySeat, cardIds: selected }),
    });
  } else if (phase.kind === 'follow' && phase.next === mySeat) {
    buttons.push({
      label: ru.table.beat, kind: 'primary',
      disabled: selected.length === 0,
      onClick: () => submit({ kind: 'follow', by: mySeat, cardIds: selected, faceDown: false }),
    });
    buttons.push({
      label: ru.table.skid, kind: 'secondary',
      disabled: selected.length === 0,
      onClick: () => submit({ kind: 'follow', by: mySeat, cardIds: selected, faceDown: true }),
    });
  } else if (phase.kind === 'extra-round' && state.currentTrick?.extraRound?.nextToAsk === mySeat) {
    buttons.push({
      label: ru.table.beat, kind: 'primary',
      disabled: selected.length === 0,
      onClick: () => submit({ kind: 'extra-beat', by: mySeat, cardIds: selected }),
    });
    buttons.push({
      label: ru.table.pass, kind: 'secondary',
      disabled: false,
      onClick: () => submit({ kind: 'extra-pass', by: mySeat }),
    });
  }

  return (
    <div className={styles.screen}>
      <InterceptBanner eligible={eligibleNow} deadlineMs={deadlineMs} onClaim={onClaimIntercept} />

      <div className={styles.opponentsRow}>
        <SeatPanel
          name={opponentBySlot.left.name}
          connected={opponentBySlot.left.connected}
          isBot={opponentBySlot.left.isBot}
          cardCount={opponentBySlot.left.count}
          active={isActiveSeat(opponentBySlot.left.seat)}
        />
        <SeatPanel
          name={opponentBySlot.top.name}
          connected={opponentBySlot.top.connected}
          isBot={opponentBySlot.top.isBot}
          cardCount={opponentBySlot.top.count}
          active={isActiveSeat(opponentBySlot.top.seat)}
        />
        <SeatPanel
          name={opponentBySlot.right.name}
          connected={opponentBySlot.right.connected}
          isBot={opponentBySlot.right.isBot}
          cardCount={opponentBySlot.right.count}
          active={isActiveSeat(opponentBySlot.right.seat)}
        />
      </div>

      <div className={styles.stockArea}>
        {state.trump && (
          <div className={styles.trumpBadge}>
            <span className={styles.trumpLabel}>Козырь</span>
            <span className={`${styles.trumpGlyph} ${state.trump === 'hearts' || state.trump === 'diamonds' ? styles.red : ''}`}>
              {suitGlyph(state.trump)}
            </span>
          </div>
        )}
        {stockCount > 0 && (
          <div className={styles.stock}>
            <span className={styles.stockCount}>{stockCount}</span>
          </div>
        )}
      </div>

      <div className={styles.trickArea}>
        <PlayedTrick
          trick={state.currentTrick}
          mySeat={mySeat}
          seatNames={seatNames}
        />
      </div>

      <div className={styles.handArea}>
        {isMyHandReal && (
          <Hand cards={myHand as never} selectedIds={selected} onToggle={toggle} interactive={isMyTurn} />
        )}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.actions}>
          {buttons.map((b, i) => (
            <button
              key={i}
              className={`${styles.actionBtn} ${b.kind === 'primary' ? styles.actionPrimary : styles.actionSecondary} ${b.disabled ? styles.actionDisabled : ''}`}
              disabled={b.disabled}
              onClick={b.onClick}
            >{b.label}</button>
          ))}
        </div>
        <div className={styles.meRow}>
          <div className={styles.meCard}>
            <Avatar name={myPresence?.name ?? '—'} size={44} active={isMyTurn} />
            <div className={styles.meName}>{myPresence?.name ?? '—'}</div>
            <div className={styles.meBadge}>{myCardCount}</div>
          </div>
          <div className={styles.scoreRow}>
            <span className={styles.scoreItem} title="Сдача">
              <span className={styles.scoreLabel}>Сдача</span>
              <span className={styles.scoreValue}>{state.sdachaNumber}</span>
            </span>
            <span className={styles.scoreItem}>
              <span className={styles.scoreLabel}>Партия</span>
              <span className={styles.scoreValue}>{state.scores.match.A}:{state.scores.match.B}</span>
            </span>
            <button
              className={`${styles.chatBtn} ${chatOpen ? styles.chatBtnActive : ''}`}
              onClick={() => setChatOpen(!chatOpen)}
              aria-label="Чат"
            >💬</button>
          </div>
        </div>
      </div>

      {chatOpen && (
        <div className={styles.chatOverlay} onClick={() => setChatOpen(false)}>
          <div className={styles.chatBox} onClick={(e) => e.stopPropagation()}>
            <ChatPanel messages={chatMessages} onSend={onSendChat} />
          </div>
        </div>
      )}
    </div>
  );
}
