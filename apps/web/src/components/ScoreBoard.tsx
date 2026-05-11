import { ru } from '../lib/i18n.js';
import styles from './ScoreBoard.module.css';

export type ScoreBoardProps = {
  match: { A: number; B: number };
  sdacha: { A: number; B: number };
  sdachaNumber: number;
};

export function ScoreBoard({ match, sdacha, sdachaNumber }: ScoreBoardProps): JSX.Element {
  return (
    <div className={styles.board} data-testid="scoreboard">
      <span className={styles.head}>{ru.table.sdacha}</span>
      <span data-testid="sdacha-num">{sdachaNumber}</span>
      <span className={styles.team}>{ru.table.teamA}</span>
      <span><span data-testid="match-A" className={styles.value}>{match.A}</span> ({ru.table.sdachaScore}: <span data-testid="sdacha-A">{sdacha.A}</span>)</span>
      <span className={styles.team}>{ru.table.teamB}</span>
      <span><span data-testid="match-B" className={styles.value}>{match.B}</span> ({ru.table.sdachaScore}: <span data-testid="sdacha-B">{sdacha.B}</span>)</span>
    </div>
  );
}
