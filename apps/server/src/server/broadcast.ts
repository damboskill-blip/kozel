import type { Server as IoServer } from 'socket.io';
import type { Room } from '../lifecycle/room.js';
import { projectStateForSeat } from '../engine/projection.js';
import type { SeatIndex, EphemeralEvent } from '@kozel/shared';

export function broadcastStatePerSeat(io: IoServer, room: Room): void {
  for (const seat of room.seats) {
    if (!seat.playerId || !seat.socketId) continue;
    const projected = projectStateForSeat(room.state, seat.seat as SeatIndex);
    io.to(seat.socketId).emit('state-update', { state: projected });
  }
}

export function broadcastEphemeral(io: IoServer, room: Room, events: EphemeralEvent[]): void {
  if (events.length === 0) return;
  io.to(room.matchId).emit('ephemeral', { events });
}
