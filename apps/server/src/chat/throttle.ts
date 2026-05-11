const CAPACITY = 5;
const REFILL_MS_PER_TOKEN = 2000;

type Bucket = { tokens: number; lastRefillAt: number };

export class ChatThrottle {
  private buckets = new Map<string, Bucket>();

  tryConsume(playerId: string, nowMs: number = Date.now()): boolean {
    const bucket = this.buckets.get(playerId) ?? { tokens: CAPACITY, lastRefillAt: nowMs };
    const elapsed = nowMs - bucket.lastRefillAt;
    const refill = Math.floor(elapsed / REFILL_MS_PER_TOKEN);
    if (refill > 0) {
      bucket.tokens = Math.min(CAPACITY, bucket.tokens + refill);
      bucket.lastRefillAt = bucket.lastRefillAt + refill * REFILL_MS_PER_TOKEN;
    }
    if (bucket.tokens <= 0) {
      this.buckets.set(playerId, bucket);
      return false;
    }
    bucket.tokens -= 1;
    this.buckets.set(playerId, bucket);
    return true;
  }
}
