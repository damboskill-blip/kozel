import type { SeatPresence, SeatIndex } from '@kozel/shared';
import { ru } from '../lib/i18n.js';
import styles from './RoomLobbyScreen.module.css';

const SEAT_NAMES = ['Север', 'Восток', 'Юг', 'Запад'];

export type RoomLobbyScreenProps = {
  roomCode: string;
  seats: SeatPresence[];
  mySeat: SeatIndex | null;
  onSit: (seat: SeatIndex) => void;
  onLeave: () => void;
  onReady: (ready: boolean) => void;
};

export function RoomLobbyScreen({ roomCode, seats, mySeat, onSit, onLeave, onReady }: RoomLobbyScreenProps): JSX.Element {
  const myReady = mySeat !== null ? seats.find((s) => s.seat === mySeat)?.ready ?? false : false;
  return (
    <div className={styles.screen}>
      <div>{ru.roomLobby.roomCode} <span className={styles.code}>{roomCode}</span></div>
      <div className={styles.seats}>
        {seats.map((s) => (
          <div key={s.seat} className={`${styles.seat} ${s.playerId ? '' : styles.empty} ${s.seat === mySeat ? styles.you : ''}`}>
            <div>{SEAT_NAMES[s.seat]}</div>
            <div>{s.name ?? '—'}</div>
            {s.playerId && <div className={s.ready ? styles.ready : ''}>{s.ready ? '✓ Готов' : 'Жду'}</div>}
            {!s.playerId && mySeat === null && (
              <button className={styles.button} onClick={() => onSit(s.seat)}>{ru.roomLobby.sitDown}</button>
            )}
          </div>
        ))}
      </div>
      {mySeat !== null && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`${styles.button} ${styles.secondary}`} onClick={onLeave}>{ru.roomLobby.leave}</button>
          <button className={styles.button} onClick={() => onReady(!myReady)}>{myReady ? 'Жду' : ru.roomLobby.ready}</button>
        </div>
      )}
    </div>
  );
}
