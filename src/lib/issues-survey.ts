import { VIC_ISSUES, type VicIssue } from '../data/vic-issues';
import { isChosen, type Chosen } from './issues-math';

export { VIC_ISSUES };
export type { VicIssue };

export const ISSUES_URL = 'https://survey.oze.net.au/s/vic-issues';
export const ISSUES_SLUG = 'vic-issues';
export const MATRIX_URL = 'https://electiontracker.au/elections/vic/2026/parties/matrix';
export const MONTHLY_POLL_URL = 'https://survey.oze.net.au/s/monthly-poll';

export const TOP_N = 3;
export const CROWD_RANK_MIN = 30;
export const PICK_SPLIT_MIN = 15;

export const RATE_ISSUES = VIC_ISSUES.filter((issue) => issue.rated);
export const COMPARE_ISSUES = VIC_ISSUES.filter((issue) => issue.compared);
export const RATE_SLUGS = RATE_ISSUES.map((issue) => issue.slug);
export const COMPARE_SLUGS = COMPARE_ISSUES.map((issue) => issue.slug);

export type LocationKind = 'vic' | 'australia' | 'overseas';

export const LOCATIONS: { id: LocationKind; label: string }[] = [
  { id: 'vic', label: 'Victoria' },
  { id: 'australia', label: 'Rest of Australia' },
  { id: 'overseas', label: 'Outside Australia' },
];

export const AGES = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'] as const;
export const ENROLLED = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unsure', label: 'Not sure' },
] as const;

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATING_VALUES)[number];

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Doesn’t affect my vote',
  2: 'A little',
  3: 'Matters',
  4: 'Important',
  5: 'A deciding issue',
};

const RATE_SET = new Set(RATE_SLUGS);
const COMPARE_SET = new Set(COMPARE_SLUGS);
const AGE_SET = new Set<string>(AGES);
const ENROLLED_SET = new Set<string>(ENROLLED.map((option) => option.id));
const LOCATION_SET = new Set<string>(LOCATIONS.map((option) => option.id));

export function issueBySlug(slug: string): VicIssue | undefined {
  return VIC_ISSUES.find((issue) => issue.slug === slug);
}

export function isRating(value: unknown): value is Rating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isLocationKind(value: unknown): value is LocationKind {
  return typeof value === 'string' && LOCATION_SET.has(value);
}

export type Ratings = Record<string, Rating>;

export type BlindPickInput = {
  slug: string;
  slot: number | 'none' | 'cant_choose';
  ms: number;
};

export type RoundIssue = {
  slug: string;
  name: string;
  chip: string;
  summary: string;
  options: string[];
};

export function ratingsComplete(ratings: Record<string, number | null | undefined>): ratings is Ratings {
  return RATE_SLUGS.every((slug) => isRating(ratings[slug]));
}

export function top3Plan(ratings: Ratings): { definite: string[]; tied: string[]; remaining: number; needChoice: boolean } {
  const sorted = RATE_SLUGS
    .map((slug) => ({ slug, score: ratings[slug] as Rating }))
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  if (sorted.length <= TOP_N) {
    return { definite: sorted.map((item) => item.slug), tied: [], remaining: 0, needChoice: false };
  }
  const third = sorted[TOP_N - 1];
  if (!third) return { definite: [], tied: [], remaining: TOP_N, needChoice: false };
  const definite = sorted.filter((item) => item.score > third.score).map((item) => item.slug);
  const tied = sorted.filter((item) => item.score === third.score).map((item) => item.slug);
  const remaining = TOP_N - definite.length;
  if (tied.length <= remaining) {
    return { definite: [...definite, ...tied], tied: [], remaining: 0, needChoice: false };
  }
  return { definite, tied, remaining, needChoice: true };
}

export function isValidTop3(ratings: Ratings, top3: string[]): boolean {
  if (top3.length !== TOP_N || new Set(top3).size !== TOP_N) return false;
  if (top3.some((slug) => !RATE_SET.has(slug) || !isRating(ratings[slug]))) return false;
  const minIn = Math.min(...top3.map((slug) => ratings[slug] as Rating));
  for (const slug of RATE_SLUGS) {
    if (top3.includes(slug)) continue;
    if ((ratings[slug] ?? 0) > minIn) return false;
  }
  const plan = top3Plan(ratings);
  if (plan.needChoice) {
    return plan.definite.every((slug) => top3.includes(slug)) &&
      top3.filter((slug) => plan.tied.includes(slug)).length === plan.remaining;
  }
  return plan.definite.every((slug) => top3.includes(slug)) && top3.every((slug) => plan.definite.includes(slug));
}

export function validateRatingsAndYou(input: {
  location?: unknown;
  age?: unknown;
  enrolled?: unknown;
  ratings?: unknown;
  top3?: unknown;
}): { location: LocationKind; age: string; enrolled: string; ratings: Ratings; top3: string[] } | string {
  if (!isLocationKind(input.location)) return 'Choose where you live.';
  if (typeof input.age !== 'string' || !AGE_SET.has(input.age)) return 'Choose an age group.';
  if (typeof input.enrolled !== 'string' || !ENROLLED_SET.has(input.enrolled)) return 'Say whether you are enrolled.';
  if (!input.ratings || typeof input.ratings !== 'object' || Array.isArray(input.ratings)) return 'Rate every issue.';
  const ratings: Ratings = {};
  for (const slug of RATE_SLUGS) {
    const value = (input.ratings as Record<string, unknown>)[slug];
    if (!isRating(value)) return 'Rate every issue from 1 to 5.';
    ratings[slug] = value;
  }
  if (!Array.isArray(input.top3) || !input.top3.every((slug) => typeof slug === 'string')) {
    return 'Choose your top 3 issues.';
  }
  const top3 = input.top3 as string[];
  if (!isValidTop3(ratings, top3)) return 'Your top 3 must be your highest-rated issues.';
  return { location: input.location, age: input.age, enrolled: input.enrolled, ratings, top3 };
}

export function validateBlindPicks(input: unknown): BlindPickInput[] | string {
  if (!Array.isArray(input) || input.length !== COMPARE_SLUGS.length) return 'Compare all 10 issues.';
  const seen = new Set<string>();
  const picks: BlindPickInput[] = [];
  for (const row of input) {
    if (!row || typeof row !== 'object') return 'Invalid comparison answers.';
    const slug = (row as { slug?: unknown }).slug;
    const slot = (row as { slot?: unknown }).slot;
    const ms = Number((row as { ms?: unknown }).ms ?? 0);
    if (typeof slug !== 'string' || !COMPARE_SET.has(slug) || seen.has(slug)) return 'Invalid comparison issue.';
    seen.add(slug);
    if (slot !== 'none' && slot !== 'cant_choose' && !(typeof slot === 'number' && slot >= 0 && slot <= 3)) {
      return 'Pick a statement, or say none / can’t choose.';
    }
    picks.push({ slug, slot: slot as BlindPickInput['slot'], ms: Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0 });
  }
  if (seen.size !== COMPARE_SLUGS.length) return 'Compare all 10 issues.';
  return picks;
}

export function rankedSlugs(ratings: Ratings): string[] {
  return [...RATE_SLUGS].sort((a, b) => (ratings[b] ?? 0) - (ratings[a] ?? 0) || a.localeCompare(b));
}

export function chosenFromSlot(slot: BlindPickInput['slot'], shown: string[]): Chosen | null {
  if (slot === 'none' || slot === 'cant_choose') return slot;
  const party = shown[slot];
  return isChosen(party) && party !== 'none' && party !== 'cant_choose' ? party : null;
}

export const ISSUES_SOCIAL_COPY = `What should decide Victoria 2026?

Compare 10 policies without seeing who wrote them, then see whose you picked. About 4–6 minutes.

${ISSUES_URL}

Sourced positions: ${MATRIX_URL}`;
