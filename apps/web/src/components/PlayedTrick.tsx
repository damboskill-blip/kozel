import type { ProjectedTrick } from '@kozel/shared';
import { Card } from './Card.js';
import styles from './PlayedTrick.module.css';

export type PlayedTrickProps = {
  trick: ProjectedTrick | null;
};

const SEAT_LABEL = ['С', 'В', 'Ю', 'З'];

export function PlayedTrick({ trick }: PlayedTrickProps): JSX.Element | null {
  if (!trick) return null;
  return (
    <div className={styles.trick} data-testid="trick">
      {trick.played.map((p, i) => (
        <div key={i} className={styles.row} data-testid={`played-seat-${p.by}`}>
          <span className={styles.label}>{SEAT_LABEL[p.by]}</span>
          {p.cards.map((c, j) => (
            <Card key={j} card={c as any} />
          ))}
        </div>
      ))}
    </div>
  );
}
