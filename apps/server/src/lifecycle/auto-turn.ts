import type { Server as IoServer } from 'socket.io';
import type { DB } from '../db/index.js';
import type { Room } from './room.js';
import { setTurnTimer, clearTurnTimer } from './timers.js';
import { engine } from '../engine/index.js';
import { appendMatchEvent, updateMatchState } from '../db/repo-matches.js';
import { chooseAutoLead, chooseAutoFollowSkid } from './auto-play.js';
import type { Action, SeatIndex } from '@kozel/shared';

const TURN_MS_PLAY = 30_000;
const TURN_MS_EXTRA = 8_000;

export function scheduleTurnTimer(
  db: DB, io: IoServer, room: Room, broadcast: (room: Room) => void,
): void {
  clearTurnTimer(room);
  const phase = room.state.phase;
  let nextSeat: SeatIndex | null = null;
  let ms = TURN_MS_PLAY;
  if (phase.kind === 'lead') nextSeat = phase.leader;
  else if (phase.kind === 'follow') nextSeat = phase.next;
  else if (phase.kind === 'extra-round') {
    nextSeat = room.state.currentTrick?.extraRound?.nextToAsk ?? null;
    ms = TURN_MS_EXTRA;
  } else if (phase.kind === 'between-tricks') {
    // Auto-close the trick + draw immediately (no player input needed).
    queueMicrotask(() => autoAdvanceBetweenTricks(db, io, room, broadcast));
    return;
  } else {
    return;
  }

  if (nextSeat === null) return;

  // Stuck-state recovery: the next-to-act seat has no cards, so no legal play
  // exists. Collapse the sdacha to its end state and let the normal end-sdacha
  // path tally points and start the next sdacha. Triggered only for legacy
  // rooms — new sdachas can't reach this state thanks to the draw-cards fix.
  if (room.state.hands[nextSeat]!.length === 0) {
    queueMicrotask(() => forceEndStuckSdacha(db, io, room, broadcast));
    return;
  }
  const seat = room.seats[nextSeat]!;
  const isAfk = !seat.connected || seat.playerId === null;

  setTurnTimer(room, () => {
    autoPlay(db, io, room, nextSeat!, broadcast);
  }, isAfk ? 1000 : ms);
}

function autoPlay(
  db: DB, io: IoServer, room: Room, seat: SeatIndex, broadcast: (room: Room) => void,
): void {
  const phase = room.state.phase;
  let action: Action;
  if (phase.kind === 'lead') {
    const cardIds = chooseAutoLead(room.state.hands[seat]!);
    if (cardIds.length === 0) return;
    action = { kind: 'lead', by: seat, cardIds };
  } else if (phase.kind === 'follow') {
    const trick = room.state.currentTrick!;
    const cardIds = chooseAutoFollowSkid(room.state.hands[seat]!, trick.leadCount, room.state.trump);
    if (cardIds.length === 0) return;
    action = { kind: 'follow', by: seat, cardIds, faceDown: true };
  } else if (phase.kind === 'extra-round') {
    action = { kind: 'extra-pass', by: seat };
  } else {
    return;
  }
  const r = engine(room.state, action);
  if (!r.ok) return;
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, action, r.events);
  broadcast(room);
  scheduleTurnTimer(db, io, room, broadcast);
}

function forceEndStuckSdacha(
  db: DB, io: IoServer, room: Room, broadcast: (room: Room) => void,
): void {
  let r = engine(room.state, { kind: 'force-end-sdacha' });
  if (!r.ok) return;
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, { kind: 'force-end-sdacha' }, r.events);
  broadcast(room);

  r = engine(room.state, { kind: 'end-sdacha' });
  if (!r.ok) return;
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, { kind: 'end-sdacha' }, r.events);
  broadcast(room);

  if (room.state.phase.kind === 'match-end') {
    room.status = 'finished';
    updateMatchState(db, room.matchId, room.state, 'finished');
    return;
  }

  const seed = Math.floor(Math.random() * 0xffffffff);
  r = engine(room.state, { kind: 'start-sdacha', seed });
  if (!r.ok) return;
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, { kind: 'start-sdacha', seed }, r.events);
  broadcast(room);

  scheduleTurnTimer(db, io, room, broadcast);
  void io;
}

function autoAdvanceBetweenTricks(
  db: DB, io: IoServer, room: Room, broadcast: (room: Room) => void,
): void {
  let r = engine(room.state, { kind: 'close-trick' });
  if (!r.ok) return;
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, { kind: 'close-trick' }, r.events);
  broadcast(room);

  r = engine(room.state, { kind: 'draw-cards' });
  if (!r.ok) return;
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, { kind: 'draw-cards' }, r.events);
  broadcast(room);

  // If sdacha is done (no more cards), call end-sdacha automatically.
  if (room.state.phase.kind === 'sdacha-end') {
    r = engine(room.state, { kind: 'end-sdacha' });
    if (!r.ok) return;
    room.state = r.state;
    updateMatchState(db, room.matchId, r.state, room.status);
    appendMatchEvent(db, room.matchId, { kind: 'end-sdacha' }, r.events);
    broadcast(room);

    if (room.state.phase.kind === 'match-end') {
      room.status = 'finished';
      updateMatchState(db, room.matchId, room.state, 'finished');
      return;
    }
    // Otherwise auto-start the next sdacha.
    const seed = Math.floor(Math.random() * 0xffffffff);
    r = engine(room.state, { kind: 'start-sdacha', seed });
    if (!r.ok) return;
    room.state = r.state;
    updateMatchState(db, room.matchId, r.state, room.status);
    appendMatchEvent(db, room.matchId, { kind: 'start-sdacha', seed }, r.events);
    broadcast(room);
  }

  scheduleTurnTimer(db, io, room, broadcast);
}
