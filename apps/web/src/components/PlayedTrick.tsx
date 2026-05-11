import type { ProjectedTrick, SeatIndex } from '@kozel/shared';
import { Card } from './Card.js';
import styles from './PlayedTrick.module.css';

export type PlayedTrickProps = {
  trick: ProjectedTrick | null;
  mySeat: SeatIndex;
  seatNames: (string | null)[];
};

type SlotPosition = 'top' | 'right' | 'bottom' | 'left';
const OFFSET_TO_POSITION: SlotPosition[] = ['bottom', 'right', 'top', 'left'];

function positionForSeat(absoluteSeat: SeatIndex, mySeat: SeatIndex): SlotPosition {
  return OFFSET_TO_POSITION[(absoluteSeat - mySeat + 4) % 4]!;
}

export function PlayedTrick({ trick, mySeat, seatNames }: PlayedTrickProps): JSX.Element | null {
  if (!trick) return null;
  const cardsBySeat: Record<number, ProjectedTrick['played'][number]['cards']> = {
    0: [], 1: [], 2: [], 3: [],
  };
  for (const p of trick.played) {
    cardsBySeat[p.by] = [...cardsBySeat[p.by]!, ...p.cards];
  }
  return (
    <div className={styles.trick} data-testid="trick">
      {[0, 1, 2, 3].map((seat) => {
        const cards = cardsBySeat[seat]!;
        if (cards.length === 0) return null;
        const pos = positionForSeat(seat as SeatIndex, mySeat);
        const name = seatNames[seat] ?? '—';
        return (
          <div
            key={seat}
            className={`${styles.slot} ${styles[pos]}`}
            data-testid={`played-seat-${seat}`}
          >
            <div className={styles.name}>{name}</div>
            <div className={styles.cards}>
              {cards.map((c, j) => (
                <Card key={j} card={c as never} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
