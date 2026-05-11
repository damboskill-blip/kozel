import type { SeatIndex, Trick } from '@kozel/shared';

export function nextSeat(s: SeatIndex): SeatIndex {
  return ((s + 1) % 4) as SeatIndex;
}

// Order in which seats are asked during extra-round: clockwise starting from
// the seat immediately after the trick's top, ending with the top seat itself.
// The top seat is asked LAST so they have the option to pile additional cards
// onto their own winning trick (i.e. lead with a higher card), increasing the
// points they collect.
export function askOrder(topSeat: SeatIndex): SeatIndex[] {
  const out: SeatIndex[] = [];
  let s = nextSeat(topSeat);
  for (let i = 0; i < 4; i++) {
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
