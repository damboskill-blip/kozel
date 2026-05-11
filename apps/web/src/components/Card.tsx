import type { Card as CardType } from '@kozel/shared';
import { suitGlyph, suitColor } from '../lib/card-display.js';
import styles from './Card.module.css';

export type CardLike = CardType | { kind: 'hidden' };

export type CardProps = {
  card: CardLike;
  selected?: boolean;
  onClick?: () => void;
  size?: 'normal' | 'small';
};

export function Card({ card, selected = false, onClick, size = 'normal' }: CardProps): JSX.Element {
  const sizeClass = size === 'small' ? styles.small : '';
  if (card.kind === 'hidden') {
    return <div data-testid="card-hidden" className={`${styles.card} ${styles.back} ${sizeClass}`} />;
  }
  if (card.kind === 'joker') {
    return (
      <div
        data-testid={`card-${card.id}`}
        className={`${styles.card} ${sizeClass} ${onClick ? styles.clickable : ''} ${selected ? styles.selected : ''}`}
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
      className={`${styles.card} ${sizeClass} ${red ? styles.red : ''} ${onClick ? styles.clickable : ''} ${selected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <span className={styles.rank}>{card.rank}</span>
      <span className={styles.suit}>{suitGlyph(card.suit)}</span>
      <span className={styles.rankBottom}>{card.rank}</span>
    </div>
  );
}
