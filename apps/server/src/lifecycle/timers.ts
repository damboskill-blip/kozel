import type { Room } from './room.js';

export function clearInterceptTimer(room: Room): void {
  if (room.interceptTimer) {
    clearTimeout(room.interceptTimer);
    room.interceptTimer = null;
  }
}

export function setInterceptTimer(room: Room, onExpire: () => void, ms: number): void {
  clearInterceptTimer(room);
  room.interceptTimer = setTimeout(onExpire, ms);
}

export function clearTurnTimer(room: Room): void {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

export function setTurnTimer(room: Room, onExpire: () => void, ms: number): void {
  clearTurnTimer(room);
  room.turnTimer = setTimeout(onExpire, ms);
}
