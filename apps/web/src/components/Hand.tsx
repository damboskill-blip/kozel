import type { Card as CardType } from '@kozel/shared';
import { Card } from './Card.js';
import styles from './Hand.module.css';

export type HandProps = {
  cards: CardType[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  interactive?: boolean;
};

export function Hand({ cards, selectedIds, onToggle, interactive = true }: HandProps): JSX.Element {
  return (
    <div className={styles.hand} data-testid="hand">
      {cards.map((c) => (
        <Card
          key={c.id}
          card={c}
          selected={selectedIds.includes(c.id)}
          onClick={interactive ? () => onToggle(c.id) : undefined}
        />
      ))}
    </div>
  );
}
