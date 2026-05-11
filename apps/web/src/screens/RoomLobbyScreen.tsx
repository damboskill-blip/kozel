import type { SeatPresence, SeatIndex } from '@kozel/shared';
import { ru } from '../lib/i18n.js';
import styles from './RoomLobbyScreen.module.css';

export type RoomLobbyScreenProps = {
  roomCode: string;
  seats: SeatPresence[];
  mySeat: SeatIndex | null;
  onSit: (seat: SeatIndex) => void;
  onLeave: () => void;
  onReady: (ready: boolean) => void;
};

type Team = { label: string; seats: [SeatIndex, SeatIndex] };
const TEAMS: Team[] = [
  { label: 'Команда 1', seats: [0, 2] },
  { label: 'Команда 2', seats: [1, 3] },
];

export function RoomLobbyScreen({ roomCode, seats, mySeat, onSit, onLeave, onReady }: RoomLobbyScreenProps): JSX.Element {
  const myReady = mySeat !== null ? seats.find((s) => s.seat === mySeat)?.ready ?? false : false;
  const seatedByIndex: Record<number, SeatPresence | undefined> = {};
  for (const s of seats) seatedByIndex[s.seat] = s;

  const findEmptySeatInTeam = (team: Team): SeatIndex | null => {
    for (const seat of team.seats) {
      if (!seatedByIndex[seat]?.playerId) return seat;
    }
    return null;
  };

  return (
    <div className={styles.screen}>
      <div>{ru.roomLobby.roomCode} <span className={styles.code}>{roomCode}</span></div>
      <div className={styles.teams}>
        {TEAMS.map((team) => {
          const members = team.seats.map((idx) => seatedByIndex[idx]);
          const emptySpot = findEmptySeatInTeam(team);
          const teamHasMe = team.seats.some((s) => s === mySeat);
          return (
            <div key={team.label} className={`${styles.team} ${teamHasMe ? styles.you : ''}`}>
              <div className={styles.teamLabel}>{team.label}</div>
              {members.map((member, i) => (
                <div key={i} className={styles.slot}>
                  <span className={member?.playerId ? styles.name : styles.emptyName}>
                    {member?.name ?? '—'}
                  </span>
                  {member?.playerId && (
                    <span className={member.ready ? styles.ready : styles.waiting}>
                      {member.ready ? '✓' : '…'}
                    </span>
                  )}
                </div>
              ))}
              {emptySpot !== null && mySeat === null && (
                <button
                  className={styles.button}
                  onClick={() => onSit(emptySpot)}
                >{ru.roomLobby.sitDown}</button>
              )}
            </div>
          );
        })}
      </div>
      {mySeat !== null && (
        <div className={styles.controls}>
          <button className={`${styles.button} ${styles.secondary}`} onClick={onLeave}>{ru.roomLobby.leave}</button>
          <button className={styles.button} onClick={() => onReady(!myReady)}>
            {myReady ? 'Жду' : ru.roomLobby.ready}
          </button>
        </div>
      )}
    </div>
  );
}
