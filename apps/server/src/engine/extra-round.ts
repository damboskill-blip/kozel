import type { Card, SeatIndex, Trick } from '@kozel/shared';

export function nextSeat(s: SeatIndex): SeatIndex {
  return ((s + 1) % 4) as SeatIndex;
}

// A trick with leadCount this large skips the extra-round entirely — there is
// nothing left to beat with (a 4-of-a-kind exhausts every higher candidate of
// that rank from the deck), and the top seat does not get to pile on either.
const EXTRA_ROUND_MIN_LEAD = 4;

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

// Compute the initial extra-round state for a trick that has just finished its
// regular follow phase, or has just been beaten in extra-round. Returns null
// when the trick should close immediately (no one can act, or leadCount is too
// large to warrant a beating round). Seats with no cards left auto-pass.
export type OpenExtraRoundResult =
  | { open: true; asked: SeatIndex[]; nextToAsk: SeatIndex }
  | { open: false };

export function openExtraRound(
  leadCount: number, topSeat: SeatIndex, hands: Card[][],
): OpenExtraRoundResult {
  if (leadCount >= EXTRA_ROUND_MIN_LEAD) return { open: false };
  const order = askOrder(topSeat);
  const asked: SeatIndex[] = order.filter((s) => hands[s]!.length === 0);
  if (asked.length === 4) return { open: false };
  const nextToAsk = order.find((s) => !asked.includes(s))!;
  return { open: true, asked, nextToAsk };
}
