import type { Card, GameState, PlayerInfo, SeatIndex, Suit } from '@kozel/shared';
import { makeDeck } from './deck.js';
import { seededShuffle } from './shuffle.js';

export type DealOutput = {
  hands: Card[][];
  stock: Card[];
  trump: Suit | null;
  trumpCardVisible: Card | null;
};

export function dealNewSdacha(seed: number): DealOutput {
  const shuffled = seededShuffle(makeDeck(), seed);
  const hands: Card[][] = [
    shuffled.slice(0, 6),
    shuffled.slice(6, 12),
    shuffled.slice(12, 18),
    shuffled.slice(18, 24),
  ];
  const stock = shuffled.slice(24);
  const bottom = stock[stock.length - 1] ?? null;
  const trump = bottom !== null && bottom.kind === 'normal' ? bottom.suit : null;
  return { hands, stock, trump, trumpCardVisible: bottom };
}

export function freshGameState(opts: {
  seed: number;
  firstLeader: SeatIndex;
  matchId: string;
  roomCode: string;
  seats: PlayerInfo[];
  sdachaNumber: number;
  matchScores: { A: number; B: number };
}): GameState {
  const dealt = dealNewSdacha(opts.seed);
  return {
    matchId: opts.matchId,
    roomCode: opts.roomCode,
    seats: opts.seats,
    hands: dealt.hands,
    stock: dealt.stock,
    trump: dealt.trump,
    trumpCardVisible: dealt.trumpCardVisible,
    phase: { kind: 'lead', leader: opts.firstLeader },
    currentTrick: null,
    nextLeader: opts.firstLeader,
    scores: { sdacha: { A: 0, B: 0 }, match: { ...opts.matchScores } },
    sdachaNumber: opts.sdachaNumber,
    log: [{ kind: 'sdacha-started', sdachaNumber: opts.sdachaNumber }],
  };
}
