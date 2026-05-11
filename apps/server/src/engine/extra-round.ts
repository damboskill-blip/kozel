import type { SeatIndex, Trick } from '@kozel/shared';

export function nextSeat(s: SeatIndex): SeatIndex {
  return ((s + 1) % 4) as SeatIndex;
}

export function askOrder(topSeat: SeatIndex): SeatIndex[] {
  const out: SeatIndex[] = [];
  let s = nextSeat(topSeat);
  while (s !== topSeat) {
    out.push(s);
    s = nextSeat(s);
  }
  return out;
}

export function nextToAskOrNull(trick: Trick): SeatIndex | null {
  const topSeat = trick.played[trick.topIndex]!.by;
  const order = askOrder(topSeat);
  for (const s of order) {
    if (!trick.extraRound!.asked.includes(s)) return s;
  }
  return null;
}
