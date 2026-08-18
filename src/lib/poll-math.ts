export const PARTY_KEYS = ['alp', 'lnp', 'onp', 'grn', 'others'] as const;
export type PartyKey = (typeof PARTY_KEYS)[number];

export const PARTY_LABELS: Record<PartyKey, string> = {
  alp: 'Labor',
  lnp: 'Coalition (L-NP)',
  onp: 'One Nation',
  grn: 'Greens',
  others: 'Other / Independent',
};

export const PARTY_COLORS: Record<PartyKey, string> = {
  alp: '#C8102E',
  lnp: '#1B4F9C',
  onp: '#E8730C',
  grn: '#1E9E43',
  others: '#6E6E7A',
};

export const INTENTION_OPTIONS: { id: PartyKey | 'prefer_not'; label: string }[] = [
  { id: 'alp', label: 'Labor' },
  { id: 'lnp', label: 'Coalition (Liberal / National)' },
  { id: 'onp', label: 'One Nation' },
  { id: 'grn', label: 'Greens' },
  { id: 'others', label: 'Other / Independent' },
  { id: 'prefer_not', label: 'Prefer not to say' },
];

export const LAST_VOTE_OPTIONS: { id: string; label: string }[] = [
  ...INTENTION_OPTIONS.filter((option) => option.id !== 'prefer_not'),
  { id: 'didnt', label: "Didn't vote / too young" },
  { id: 'not_vic', label: 'Not in Victoria then' },
  { id: 'prefer_not', label: 'Prefer not to say' },
];

export type Primaries = Record<PartyKey, number>;

export type BlocSplit = {
  core: { left: number; right: number; other: number };
  other_split_proportional: { left: number; right: number; left_from_other: number; right_from_other: number };
  other_split_even: { left: number; right: number };
};

export function countsToPrimaries(counts: Partial<Record<PartyKey, number>>): { primaries: Primaries; n: number } {
  const n = PARTY_KEYS.reduce((sum, key) => sum + Number(counts[key] ?? 0), 0);
  const primaries = Object.fromEntries(
    PARTY_KEYS.map((key) => [key, n === 0 ? 0 : (100 * Number(counts[key] ?? 0)) / n]),
  ) as Primaries;
  return { primaries, n };
}

export function blocsFromPrimaries(primaries: Primaries): BlocSplit {
  const left = primaries.alp + primaries.grn;
  const right = primaries.lnp + primaries.onp;
  const other = primaries.others;
  const core = left + right;
  const leftShare = core > 0 ? left / core : 0.5;
  const rightShare = core > 0 ? right / core : 0.5;
  return {
    core: { left, right, other },
    other_split_proportional: {
      left: left + other * leftShare,
      right: right + other * rightShare,
      left_from_other: other * leftShare,
      right_from_other: other * rightShare,
    },
    other_split_even: {
      left: left + other / 2,
      right: right + other / 2,
    },
  };
}

export function isPartyKey(value: string): value is PartyKey {
  return (PARTY_KEYS as readonly string[]).includes(value);
}
