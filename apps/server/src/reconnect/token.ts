import { randomBytes, createHash } from 'node:crypto';

export function generateReconnectToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashReconnectToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
