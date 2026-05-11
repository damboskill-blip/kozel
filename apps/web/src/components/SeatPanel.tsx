import { Card } from './Card.js';
import styles from './SeatPanel.module.css';

export type SeatPanelProps = {
  name: string | null;
  connected: boolean;
  cardCount: number;
  active?: boolean;
};

export function SeatPanel({ name, connected, cardCount, active = false }: SeatPanelProps): JSX.Element {
  return (
    <div className={`${styles.seat} ${active ? styles.active : ''}`} data-testid="seat-panel">
      <div className={`${styles.name} ${connected ? '' : styles.disconnected}`}>{name ?? '—'}</div>
      <div style={{ display: 'flex', gap: '-30px' }}>
        {Array.from({ length: Math.min(cardCount, 6) }, (_, i) => (
          <Card key={i} card={{ kind: 'hidden' } as any} />
        ))}
      </div>
      <div className={styles.count}>{cardCount} карт</div>
    </div>
  );
}
