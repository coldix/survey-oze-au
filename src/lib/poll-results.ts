import { blocsFromPrimaries, countsToPrimaries, isPartyKey, type PartyKey, type Primaries } from './poll-math';
import { AUGUST_START_COUNTS, AUGUST_START_N } from './poll-seed';
import type { AuState } from './postcode';

export type PollRow = {
  postcode: string;
  state: string;
  enrolled: string;
  vic_now: string;
  federal_now: string;
  source?: string | null;
};

export type ContestPies = {
  n: number;
  primaries: Primaries;
  blocs: ReturnType<typeof blocsFromPrimaries>;
};

export type StateRow = { state: AuState; n: number; primaries: Primaries };

export type PollMonthResults = {
  month: string;
  vic: ContestPies;
  federal: ContestPies;
  federalByState: StateRow[];
  seedCount: number;
  liveCount: number;
};

const STATES: AuState[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

function tally(
  rows: PollRow[],
  pick: (row: PollRow) => string,
  extra?: Partial<Record<PartyKey, number>>,
): ContestPies {
  const counts: Partial<Record<PartyKey, number>> = { ...extra };
  for (const row of rows) {
    const value = pick(row);
    if (!isPartyKey(value)) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  const { primaries, n } = countsToPrimaries(counts);
  return { n, primaries, blocs: blocsFromPrimaries(primaries) };
}

export function summarisePollMonth(month: string, rows: PollRow[]): PollMonthResults {
  const live = rows.filter((row) => row.source !== 'seed');
  const enrolled = live.filter((row) => row.enrolled === 'yes');
  const vicRows = enrolled.filter((row) => row.state === 'VIC');
  const start = month === '2026-08' ? AUGUST_START_COUNTS : undefined;
  const federalByState: StateRow[] = STATES.map((state) => {
    const slice = enrolled.filter((row) => row.state === state);
    const { primaries, n } = countsToPrimaries(
      slice.reduce<Partial<Record<PartyKey, number>>>((counts, row) => {
        if (isPartyKey(row.federal_now)) counts[row.federal_now] = (counts[row.federal_now] ?? 0) + 1;
        return counts;
      }, {}),
    );
    return { state, n, primaries };
  }).filter((row) => row.n > 0);

  return {
    month,
    vic: tally(vicRows, (row) => row.vic_now, start),
    federal: tally(enrolled, (row) => row.federal_now, start),
    federalByState,
    seedCount: month === '2026-08' ? AUGUST_START_N : 0,
    liveCount: live.length,
  };
}
