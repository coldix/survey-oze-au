import { VIC_ISSUES, type DisplayPartyId, type VicIssue } from '../data/vic-issues';

export { VIC_ISSUES };
export type { DisplayPartyId, VicIssue };

export const ISSUES_URL = 'https://survey.oze.net.au/s/vic-issues';
export const ISSUES_SLUG = 'vic-issues';
export const MATRIX_URL = 'https://electiontracker.au/elections/vic/2026/parties/matrix';
export const MONTHLY_POLL_URL = 'https://survey.oze.net.au/s/monthly-poll';

export const TOP_N = 3;
export const CROWD_RANK_MIN = 30;
export const PICK_SPLIT_MIN = 15;

export const DISPLAY_PARTIES: { id: DisplayPartyId; label: string }[] = [
  { id: 'greens', label: 'Greens' },
  { id: 'labor', label: 'Labor' },
  { id: 'coalition', label: 'Liberal–Nationals' },
  { id: 'one-nation', label: 'One Nation' },
];

export const PICK_OPTIONS: { id: PickId; label: string }[] = [
  ...DISPLAY_PARTIES,
  { id: 'unsure', label: 'Not sure' },
  { id: 'none', label: 'No one' },
];

export type PickId = DisplayPartyId | 'unsure' | 'none';
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

export const ISSUE_SLUGS = VIC_ISSUES.map((issue) => issue.slug);
const ISSUE_SET = new Set(ISSUE_SLUGS);
const PICK_SET = new Set<string>(PICK_OPTIONS.map((option) => option.id));
const AGE_SET = new Set<string>(AGES);
const ENROLLED_SET = new Set<string>(ENROLLED.map((option) => option.id));
const LOCATION_SET = new Set<string>(LOCATIONS.map((option) => option.id));

export function issueBySlug(slug: string): VicIssue | undefined {
  return VIC_ISSUES.find((issue) => issue.slug === slug);
}

export function isRating(value: unknown): value is Rating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isPickId(value: unknown): value is PickId {
  return typeof value === 'string' && PICK_SET.has(value);
}

export function isLocationKind(value: unknown): value is LocationKind {
  return typeof value === 'string' && LOCATION_SET.has(value);
}

export type Ratings = Record<string, Rating>;

export type IssuesAnswers = {
  location: LocationKind;
  ratings: Ratings;
  top3: string[];
  picks: Record<string, PickId>;
};

export function ratingsComplete(ratings: Record<string, number | null | undefined>): ratings is Ratings {
  return ISSUE_SLUGS.every((slug) => isRating(ratings[slug]));
}

/** Highest-score issues. If more than three sit on the cutoff score, the user must pick among that tied set. */
export function top3Plan(ratings: Ratings): { definite: string[]; tied: string[]; remaining: number; needChoice: boolean } {
  const sorted = ISSUE_SLUGS
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
  if (top3.some((slug) => !ISSUE_SET.has(slug) || !isRating(ratings[slug]))) return false;
  const minIn = Math.min(...top3.map((slug) => ratings[slug] as Rating));
  for (const slug of ISSUE_SLUGS) {
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

export function validateIssuesAnswers(input: {
  location?: unknown;
  age?: unknown;
  enrolled?: unknown;
  ratings?: unknown;
  top3?: unknown;
  picks?: unknown;
}): IssuesAnswers | string {
  if (!isLocationKind(input.location)) return 'Choose where you live.';
  if (typeof input.age !== 'string' || !AGE_SET.has(input.age)) return 'Choose an age group.';
  if (typeof input.enrolled !== 'string' || !ENROLLED_SET.has(input.enrolled)) return 'Say whether you are enrolled.';
  if (!input.ratings || typeof input.ratings !== 'object' || Array.isArray(input.ratings)) return 'Rate every issue.';
  const ratings: Ratings = {};
  for (const slug of ISSUE_SLUGS) {
    const value = (input.ratings as Record<string, unknown>)[slug];
    if (!isRating(value)) return 'Rate every issue from 1 to 5.';
    ratings[slug] = value;
  }
  if (!Array.isArray(input.top3) || !input.top3.every((slug) => typeof slug === 'string')) {
    return 'Choose your top 3 issues.';
  }
  const top3 = input.top3 as string[];
  if (!isValidTop3(ratings, top3)) return 'Your top 3 must be your highest-rated issues.';
  if (!input.picks || typeof input.picks !== 'object' || Array.isArray(input.picks)) {
    return 'Pick whose policy is closest on your top 3.';
  }
  const picks: Record<string, PickId> = {};
  for (const slug of top3) {
    const value = (input.picks as Record<string, unknown>)[slug];
    if (!isPickId(value)) return 'Pick whose policy is closest on each of your top 3.';
    picks[slug] = value;
  }
  return { location: input.location, ratings, top3, picks };
}

export function parseStoredAnswers(raw: unknown): IssuesAnswers | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const result = validateIssuesAnswers({
    location: input.location,
    age: '18–24',
    enrolled: 'yes',
    ratings: input.ratings,
    top3: input.top3,
    picks: input.picks,
  });
  return typeof result === 'string' ? null : result;
}

export function rankedSlugs(ratings: Ratings): string[] {
  return [...ISSUE_SLUGS].sort((a, b) => (ratings[b] ?? 0) - (ratings[a] ?? 0) || a.localeCompare(b));
}

export const ISSUES_SOCIAL_COPY = `What should decide Victoria 2026?

Rank the 15 issues from the policy matrix, then pick whose sourced policy is closest — in your view. About 3 minutes. Open to anyone, including overseas.

${ISSUES_URL}

Sourced party positions: ${MATRIX_URL}`;
