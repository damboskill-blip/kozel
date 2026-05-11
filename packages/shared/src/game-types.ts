// Suits and ranks
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// Card. 6♠ and 6♣ are excluded from normal cards (replaced by jokers).
export type NormalCard = { kind: 'normal'; suit: Suit; rank: Rank; id: string };
export type JokerCard = { kind: 'joker'; id: 'joker-1' | 'joker-2' };
export type Card = NormalCard | JokerCard;

// Seats: 0=North, 1=East, 2=South, 3=West.
// Teams: A = seats 0+2, B = seats 1+3.
export type SeatIndex = 0 | 1 | 2 | 3;
export type Team = 'A' | 'B';

export type LeadCount = 1 | 2 | 3 | 4 | 5 | 6;

export type PlayedSet = {
  by: SeatIndex;
  cards: Card[];
  faceDown: boolean;
};

export type ExtraRoundState = {
  asked: SeatIndex[];
  nextToAsk: SeatIndex;
};

export type Trick = {
  leadCount: LeadCount;
  leadSuit: Suit | 'joker-only';
  played: PlayedSet[];
  topIndex: number;
  lockedFromBeating: SeatIndex[];
  extraRound: ExtraRoundState | null;
};

export type GamePhase =
  | { kind: 'intercept-window'; eligible: SeatIndex[]; deadlineMs: number }
  | { kind: 'lead'; leader: SeatIndex }
  | { kind: 'follow'; next: SeatIndex }
  | { kind: 'extra-round' }
  | { kind: 'between-tricks' }
  | { kind: 'sdacha-end' }
  | { kind: 'match-end'; loser: Team };

export type PlayerInfo = {
  playerId: string;
  name: string;
  seat: SeatIndex;
  connected: boolean;
};

export type Scores = {
  sdacha: { A: number; B: number };
  match: { A: number; B: number };
};

export type GameEvent =
  | { kind: 'sdacha-started'; sdachaNumber: number }
  | { kind: 'lead'; by: SeatIndex; cards: Card[] }
  | { kind: 'follow'; by: SeatIndex; cards: Card[]; faceDown: boolean }
  | { kind: 'extra-beat'; by: SeatIndex; cards: Card[] }
  | { kind: 'extra-pass'; by: SeatIndex }
  | { kind: 'trick-closed'; winner: SeatIndex; team: Team; points: number }
  | { kind: 'trump-changed'; toSuit: Suit | null; via: Card }
  | { kind: 'intercept-claimed'; by: SeatIndex }
  | { kind: 'sdacha-ended'; scores: { A: number; B: number }; penalties: { A: number; B: number } }
  | { kind: 'match-ended'; loser: Team };

export type GameState = {
  matchId: string;
  roomCode: string;
  seats: PlayerInfo[];
  hands: Card[][];
  stock: Card[];
  trump: Suit | null;
  trumpCardVisible: Card | null;
  phase: GamePhase;
  currentTrick: Trick | null;
  nextLeader: SeatIndex;
  scores: Scores;
  sdachaNumber: number;
  log: GameEvent[];
};

export type Action =
  | { kind: 'start-match'; seed: number; firstLeader: SeatIndex; matchId: string; roomCode: string; seats: PlayerInfo[] }
  | { kind: 'start-sdacha'; seed: number }
  | { kind: 'claim-intercept'; by: SeatIndex }
  | { kind: 'intercept-window-expired' }
  | { kind: 'lead'; by: SeatIndex; cardIds: string[] }
  | { kind: 'follow'; by: SeatIndex; cardIds: string[]; faceDown: boolean }
  | { kind: 'extra-beat'; by: SeatIndex; cardIds: string[] }
  | { kind: 'extra-pass'; by: SeatIndex }
  | { kind: 'close-trick' }
  | { kind: 'draw-cards' }
  | { kind: 'end-sdacha' }
  | { kind: 'rematch'; seed: number };

export type EphemeralEvent =
  | { kind: 'dealt' }
  | { kind: 'trump-revealed'; card: Card }
  | { kind: 'trump-changed'; toSuit: Suit | null; card: Card }
  | { kind: 'intercept-window-open'; eligibleSeats: SeatIndex[]; deadlineMs: number }
  | { kind: 'intercept-claimed'; bySeat: SeatIndex }
  | { kind: 'cards-played'; bySeat: SeatIndex; count: number; faceDown: boolean }
  | { kind: 'trick-won'; bySeat: SeatIndex; team: Team; points: number }
  | { kind: 'sdacha-end'; scores: { A: number; B: number }; penalties: { A: number; B: number } }
  | { kind: 'match-end'; loser: Team };

export type EngineResult =
  | { ok: true; state: GameState; events: EphemeralEvent[] }
  | { ok: false; error: EngineError };

export type EngineError =
  | 'invalid-action-for-phase'
  | 'not-your-turn'
  | 'wrong-card-count'
  | 'cards-not-in-hand'
  | 'invalid-lead-suit-mix'
  | 'invalid-pairing'
  | 'cannot-beat'
  | 'locked-from-beating'
  | 'not-eligible-for-intercept'
  | 'unknown-action';

export function teamOf(seat: SeatIndex): Team {
  return seat % 2 === 0 ? 'A' : 'B';
}

export function partnerOf(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex;
}

export function nextSeatClockwise(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}
