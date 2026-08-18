import type { PartyKey } from './poll-math';

/** August 2026 only: one starter count of 1000, split to the Election Tracker average (no bands). */
export const AUGUST_START_N = 1000;

export const AUGUST_START_COUNTS: Record<PartyKey, number> = {
  alp: 277,
  lnp: 214,
  onp: 268,
  grn: 131,
  others: 110,
};


