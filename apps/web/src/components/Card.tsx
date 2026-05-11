import type { Card as CardType } from '@kozel/shared';
import { suitGlyph, suitColor } from '../lib/card-display.js';
import styles from './Card.module.css';

export type CardLike = CardType | { kind: 'hidden' };

export type CardProps = {
  card: CardLike;
  selected?: boolean;
  onClick?: () => void;
};

export function Card({ card, selected = false, onClick }: CardProps): JSX.Element {
  if (card.kind === 'hidden') {
    return <div data-testid="card-hidden" className={`${styles.card} ${styles.back}`} />;
  }
  if (card.kind === 'joker') {
    return (
      <div
        data-testid={`card-${card.id}`}
        className={`${styles.card} ${onClick ? styles.clickable : ''} ${selected ? styles.selected : ''}`}
        onClick={onClick}
      >
        <span className={styles.joker}>★</span>
      </div>
    );
  }
  const red = suitColor(card.suit) === 'red';
  return (
    <div
      data-testid={`card-${card.id}`}
      className={`${styles.card} ${red ? styles.red : ''} ${onClick ? styles.clickable : ''} ${selected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <span className={styles.rank}>{card.rank}</span>
      <span className={styles.suit}>{suitGlyph(card.suit)}</span>
      <span className={styles.rankBottom}>{card.rank}</span>
    </div>
  );
}
