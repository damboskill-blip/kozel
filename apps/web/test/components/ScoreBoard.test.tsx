import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBoard } from '../../src/components/ScoreBoard.js';

describe('ScoreBoard', () => {
  it('renders match and sdacha scores for both teams', () => {
    render(<ScoreBoard match={{ A: 8, B: 5 }} sdacha={{ A: 3, B: 2 }} sdachaNumber={4} />);
    expect(screen.getByTestId('match-A')).toHaveTextContent('8');
    expect(screen.getByTestId('match-B')).toHaveTextContent('5');
    expect(screen.getByTestId('sdacha-A')).toHaveTextContent('3');
    expect(screen.getByTestId('sdacha-B')).toHaveTextContent('2');
    expect(screen.getByTestId('sdacha-num')).toHaveTextContent('4');
  });
});
