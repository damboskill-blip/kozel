import { Card } from './Card.js';
import { Avatar } from './Avatar.js';
import styles from './SeatPanel.module.css';

export type SeatPanelProps = {
  name: string | null;
  connected: boolean;
  cardCount: number;
  active?: boolean;
  isBot?: boolean;
};

export function SeatPanel({ name, connected, cardCount, active = false, isBot = false }: SeatPanelProps): JSX.Element {
  const showDisconnected = !connected && !isBot;
  const stackCount = Math.min(cardCount, 5);
  return (
    <div className={`${styles.seat} ${active ? styles.active : ''}`} data-testid="seat-panel">
      <div className={styles.stack}>
        {Array.from({ length: stackCount }, (_, i) => (
          <div
            key={i}
            className={styles.stackCard}
            style={{ transform: `translate(${i * 4 - stackCount * 2}px, ${i * -2}px) rotate(${(i - stackCount / 2) * 4}deg)` }}
          >
            <Card card={{ kind: 'hidden' } as never} size="small" />
          </div>
        ))}
      </div>
      <div className={styles.avatarRow}>
        <Avatar name={name} size={56} active={active} />
        {cardCount > 0 && <div className={styles.badge}>{cardCount}</div>}
      </div>
      <div className={`${styles.name} ${showDisconnected ? styles.disconnected : ''}`}>
        {name ?? '—'}
      </div>
    </div>
  );
}
