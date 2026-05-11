import { Card } from './Card.js';
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
  return (
    <div className={`${styles.seat} ${active ? styles.active : ''}`} data-testid="seat-panel">
      <div className={`${styles.name} ${showDisconnected ? styles.disconnected : ''}`}>{name ?? '—'}</div>
      <div style={{ display: 'flex', gap: '-30px' }}>
        {Array.from({ length: Math.min(cardCount, 6) }, (_, i) => (
          <Card key={i} card={{ kind: 'hidden' } as any} />
        ))}
      </div>
      <div className={styles.count}>{cardCount} карт</div>
    </div>
  );
}
