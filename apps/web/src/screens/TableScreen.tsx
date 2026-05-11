import { useMemo, useState } from 'react';
import type { ProjectedGameState, SeatPresence, SeatIndex, Action } from '@kozel/shared';
import { Hand } from '../components/Hand.js';
import { PlayedTrick } from '../components/PlayedTrick.js';
import { ScoreBoard } from '../components/ScoreBoard.js';
import { SeatPanel } from '../components/SeatPanel.js';
import { InterceptBanner } from '../components/InterceptBanner.js';
import { ChatPanel } from '../components/ChatPanel.js';
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
  const myHand = state.hands[mySeat];
  const isMyHandReal = Array.isArray(myHand);

  const opponents = useMemo(() => {
    return [0, 1, 2, 3]
      .filter((i) => i !== mySeat)
      .map((i) => {
        const h = state.hands[i];
        const count = Array.isArray(h) ? h.length : h.count;
        const seat = seats.find((s) => s.seat === i)!;
        return { seat: i, name: seat?.name ?? null, connected: seat?.connected ?? false, count };
      });
  }, [state, seats, mySeat]);

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

  const submit = (a: Action): void => {
    onAction(a);
    setSelected([]);
  };

  const trumpLabel = state.trump
    ? `${ru.table.trump}: ${suitGlyph(state.trump)}`
    : ru.table.noTrump;

  return (
    <div className={styles.screen}>
      <InterceptBanner eligible={eligibleNow} deadlineMs={deadlineMs} onClaim={onClaimIntercept} />
      <div className={styles.top}>
        <ScoreBoard match={state.scores.match} sdacha={state.scores.sdacha} sdachaNumber={state.sdachaNumber} />
        <div className={styles.trump}>{trumpLabel}</div>
      </div>
      <div className={styles.opponents}>
        {opponents.map((o) => (
          <SeatPanel key={o.seat} name={o.name} connected={o.connected} cardCount={o.count}
            active={(phase.kind === 'lead' && phase.leader === o.seat) || (phase.kind === 'follow' && phase.next === o.seat)} />
        ))}
      </div>
      <div className={styles.center}>
        <PlayedTrick trick={state.currentTrick} />
      </div>
      <div className={styles.actions}>
        {phase.kind === 'lead' && phase.leader === mySeat && (
          <button
            className={`${styles.button} ${selected.length === 0 ? styles.disabled : ''}`}
            disabled={selected.length === 0}
            onClick={() => submit({ kind: 'lead', by: mySeat, cardIds: selected })}
          >Ход</button>
        )}
        {phase.kind === 'follow' && phase.next === mySeat && (
          <>
            <button
              className={`${styles.button} ${selected.length === 0 ? styles.disabled : ''}`}
              disabled={selected.length === 0}
              onClick={() => submit({ kind: 'follow', by: mySeat, cardIds: selected, faceDown: false })}
            >{ru.table.beat}</button>
            <button
              className={`${styles.button} ${selected.length === 0 ? styles.disabled : ''}`}
              disabled={selected.length === 0}
              onClick={() => submit({ kind: 'follow', by: mySeat, cardIds: selected, faceDown: true })}
            >{ru.table.skid}</button>
          </>
        )}
        {phase.kind === 'extra-round' && state.currentTrick?.extraRound?.nextToAsk === mySeat && (
          <>
            <button className={styles.button} onClick={() => submit({ kind: 'extra-pass', by: mySeat })}>{ru.table.pass}</button>
            <button
              className={`${styles.button} ${selected.length === 0 ? styles.disabled : ''}`}
              disabled={selected.length === 0}
              onClick={() => submit({ kind: 'extra-beat', by: mySeat, cardIds: selected })}
            >{ru.table.beat}</button>
          </>
        )}
      </div>
      <div className={styles.bottom}>
        <div className={styles.handArea}>
          {isMyHandReal && (
            <Hand cards={myHand as any} selectedIds={selected} onToggle={toggle} interactive={isMyTurn} />
          )}
        </div>
        <ChatPanel messages={chatMessages} onSend={onSendChat} />
      </div>
    </div>
  );
}
