import { PARTY_COLORS } from './poll-math';

export const PICK_PARTIES = ['grn', 'alp', 'lnp', 'onp'] as const;
export type PickParty = (typeof PICK_PARTIES)[number];
export type Chosen = PickParty | 'none' | 'cant_choose';
export type PieKey = PickParty | 'nopick';

export const PICK_PARTY_LABELS: Record<PickParty, string> = {
  grn: 'Greens',
  alp: 'Labor',
  lnp: 'Coalition',
  onp: 'One Nation',
};

export const PIE_COLORS: Record<PieKey, string> = {
  grn: PARTY_COLORS.grn,
  alp: PARTY_COLORS.alp,
  lnp: PARTY_COLORS.lnp,
  onp: PARTY_COLORS.onp,
  nopick: '#6E6E7A',
};

export const PIE_LABELS: Record<PieKey, string> = {
  ...PICK_PARTY_LABELS,
  nopick: 'No pick',
};

export function isPickParty(value: string): value is PickParty {
  return (PICK_PARTIES as readonly string[]).includes(value);
}

export function isChosen(value: unknown): value is Chosen {
  return value === 'none' || value === 'cant_choose' || (typeof value === 'string' && isPickParty(value));
}

export type PickRow = {
  slug: string;
  chosen: Chosen;
  rating: number;
};

export type PieShares = Record<PieKey, number>;

const EMPTY: PieShares = { grn: 0, alp: 0, lnp: 0, onp: 0, nopick: 0 };

function toPieKey(chosen: Chosen): PieKey {
  return chosen === 'none' || chosen === 'cant_choose' ? 'nopick' : chosen;
}

export function unweightedShares(picks: PickRow[]): PieShares {
  const counts = { ...EMPTY };
  for (const pick of picks) counts[toPieKey(pick.chosen)] += 1;
  const n = picks.length || 1;
  return {
    grn: counts.grn / n,
    alp: counts.alp / n,
    lnp: counts.lnp / n,
    onp: counts.onp / n,
    nopick: counts.nopick / n,
  };
}

export function weightedShares(picks: PickRow[]): PieShares {
  const weights = { ...EMPTY };
  let total = 0;
  for (const pick of picks) {
    const weight = pick.rating;
    weights[toPieKey(pick.chosen)] += weight;
    total += weight;
  }
  const denom = total || 1;
  return {
    grn: weights.grn / denom,
    alp: weights.alp / denom,
    lnp: weights.lnp / denom,
    onp: weights.onp / denom,
    nopick: weights.nopick / denom,
  };
}

export function countParties(picks: PickRow[]): Record<PickParty, number> {
  const counts: Record<PickParty, number> = { grn: 0, alp: 0, lnp: 0, onp: 0 };
  for (const pick of picks) {
    if (isPickParty(pick.chosen)) counts[pick.chosen] += 1;
  }
  return counts;
}

function possesive(party: PickParty): string {
  if (party === 'grn') return "the Greens'";
  if (party === 'alp') return "Labor's";
  if (party === 'lnp') return "the Coalition's";
  return "One Nation's";
}

export function pickHeadline(picks: PickRow[]): string {
  const counts = countParties(picks);
  const max = Math.max(...PICK_PARTIES.map((key) => counts[key]));
  if (max <= 0) return 'Your picks were spread across four parties — no clear favourite.';
  const leaders = PICK_PARTIES.filter((key) => counts[key] === max);
  if (leaders.length === 1) {
    const party = leaders[0]!;
    return `You picked ${possesive(party)} policy most often — ${max} of your 10 choices.`;
  }
  if (leaders.length === 2) {
    const [a, b] = leaders;
    return `You picked ${PICK_PARTY_LABELS[a!]} and ${PICK_PARTY_LABELS[b!]} most often — ${max} each.`;
  }
  return 'Your picks were spread across four parties — no clear favourite.';
}

export type RevealPick = {
  slug: string;
  name: string;
  claim: string;
  chosen: Chosen;
  partyLabel: string | null;
};

export type RevealPayload = {
  headline: string;
  picks: RevealPick[];
  unweighted: PieShares;
  weighted: PieShares;
  ratings: Record<string, number>;
  top3: string[];
};

export function sharePercents(shares: PieShares): Record<PieKey, number> {
  return {
    grn: Math.round(shares.grn * 100),
    alp: Math.round(shares.alp * 100),
    lnp: Math.round(shares.lnp * 100),
    onp: Math.round(shares.onp * 100),
    nopick: Math.round(shares.nopick * 100),
  };
}
