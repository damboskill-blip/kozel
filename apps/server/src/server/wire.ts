import { z } from 'zod';

export const HelloPayload = z.object({
  reconnectToken: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  name: z.string().min(1).max(32).optional(),
});

export const CreateRoomPayload = z.object({});

export const JoinRoomPayload = z.object({
  roomCode: z.string().regex(/^[A-Z2-9]{6}$/),
});

export const TakeSeatPayload = z.object({
  seat: z.number().int().min(0).max(3),
});

export const LeaveSeatPayload = z.object({});

export const ReadyPayload = z.object({
  ready: z.boolean(),
});

export const ChatPayload = z.object({
  text: z.string().min(1).max(200),
});

export const ClaimInterceptPayload = z.object({});

// `action` payload — discriminated union mirroring Action type. We validate kind+shape lightly;
// engine itself is authoritative.
export const ActionPayload = z.union([
  z.object({ kind: z.literal('start-sdacha'), seed: z.number().int() }),
  z.object({ kind: z.literal('lead'), by: z.number().int().min(0).max(3), cardIds: z.array(z.string()).min(1).max(6) }),
  z.object({ kind: z.literal('follow'), by: z.number().int().min(0).max(3), cardIds: z.array(z.string()).min(1).max(6), faceDown: z.boolean() }),
  z.object({ kind: z.literal('extra-beat'), by: z.number().int().min(0).max(3), cardIds: z.array(z.string()).min(1).max(6) }),
  z.object({ kind: z.literal('extra-pass'), by: z.number().int().min(0).max(3) }),
  z.object({ kind: z.literal('close-trick') }),
  z.object({ kind: z.literal('draw-cards') }),
  z.object({ kind: z.literal('end-sdacha') }),
  z.object({ kind: z.literal('rematch'), seed: z.number().int() }),
]);
