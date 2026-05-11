import type {
  Action, EphemeralEvent, SeatIndex, Team, Card, GameState, Suit, GamePhase, Trick, PlayedSet,
} from './game-types.js';

// Per-seat projected state (server hides other players' hands and face-down cards).
export type HiddenCard = { kind: 'hidden' };
export type ProjectedHand = Card[] | { count: number };
export type ProjectedPlayedSet = Omit<PlayedSet, 'cards'> & { cards: (Card | HiddenCard)[] };
export type ProjectedTrick = Omit<Trick, 'played'> & { played: ProjectedPlayedSet[] };
export type ProjectedGameState = Omit<GameState, 'hands' | 'currentTrick'> & {
  hands: ProjectedHand[];
  currentTrick: ProjectedTrick | null;
};

export type SeatPresence = {
  seat: SeatIndex;
  playerId: string | null;
  name: string | null;
  connected: boolean;
  ready: boolean;
  isBot?: boolean;
};

export type RoomSnapshot = {
  roomCode: string;
  matchId: string;
  status: 'lobby' | 'playing' | 'finished';
  mySeat: SeatIndex | null;
  seats: SeatPresence[];
  state: ProjectedGameState | null;        // null in lobby; non-null after match-started
};

// Client → server
export type ClientToServerEvents = {
  hello: (
    payload: { reconnectToken?: string; name?: string },
    cb: (resp: { playerId: string; reconnectToken: string; room?: RoomSnapshot }) => void,
  ) => void;
  'create-room': (
    payload: {},
    cb: (resp: { roomCode: string } | { error: string }) => void,
  ) => void;
  'join-room': (
    payload: { roomCode: string },
    cb: (resp: RoomSnapshot | { error: string }) => void,
  ) => void;
  'take-seat': (
    payload: { seat: SeatIndex },
    cb: (resp: { ok: true } | { error: string }) => void,
  ) => void;
  'leave-seat': (payload: {}, cb: (resp: { ok: true }) => void) => void;
  ready: (
    payload: { ready: boolean },
    cb: (resp: { ok: true } | { error: string }) => void,
  ) => void;
  action: (
    payload: Action,
    cb: (resp: { ok: true } | { error: string }) => void,
  ) => void;
  'claim-intercept': (
    payload: {},
    cb: (resp: { ok: true } | { error: string }) => void,
  ) => void;
  chat: (
    payload: { text: string },
    cb: (resp: { ok: true } | { error: string }) => void,
  ) => void;
  'add-bot': (
    payload: {},
    cb: (resp: { ok: true } | { error: string }) => void,
  ) => void;
};

// Server → client
export type ServerToClientEvents = {
  'seats-updated': (payload: { seats: SeatPresence[] }) => void;
  'match-started': (payload: { matchId: string; sdachaNumber: number }) => void;
  'state-update': (payload: { state: ProjectedGameState }) => void;
  ephemeral: (payload: { events: EphemeralEvent[] }) => void;
  'intercept-window': (payload: { eligibleSeats: SeatIndex[]; deadlineMs: number }) => void;
  chat: (payload: { from: SeatIndex; name: string; text: string; at: number }) => void;
  error: (payload: { code: string; message: string }) => void;
  'room-closed': (payload: {}) => void;
};

export type SocketData = {
  playerId: string;
  matchId: string | null;
};

// Re-exports for client convenience
export type { Action, EphemeralEvent, SeatIndex, Team, Card, GameState, Suit, GamePhase, Trick, PlayedSet };
