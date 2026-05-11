const KEY = 'kozel.session';

export type StoredSession = {
  playerId: string;
  name: string;
  reconnectToken: string;
  lastRoom: string | null;
};

export function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.playerId || !parsed.reconnectToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
