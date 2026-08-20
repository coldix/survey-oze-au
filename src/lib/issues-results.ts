import { CROWD_RANK_MIN, PICK_SPLIT_MIN, RATE_SLUGS, COMPARE_SLUGS } from './issues-survey';


export type RatingRow = {
  state: string | null;
  ratings: Record<string, number>;
};

export type SqlPickRow = {
  issue_slug: string;
  chosen: string;
  n: number;
  weight: number;
  vic: number;
};

export type IssueCrowd = {
  slug: string;
  nRated: number;
  mean: number | null;
  rank: number | null;
  nPicks: number;
  pickCounts: Record<string, number>;
  showPicks: boolean;
};

export type IssuesView = {
  n: number;
  showRank: boolean;
  issues: IssueCrowd[];
};

export type IssuesMonthResults = {
  month: string;
  everywhere: IssuesView;
  victoria: IssuesView;
};

function meanMap(rows: RatingRow[]): Map<string, { n: number; mean: number | null }> {
  const sums = new Map<string, { n: number; total: number }>();
  for (const slug of RATE_SLUGS) sums.set(slug, { n: 0, total: 0 });
  for (const row of rows) {
    for (const slug of RATE_SLUGS) {
      const value = row.ratings[slug];
      if (typeof value !== 'number') continue;
      const bucket = sums.get(slug)!;
      bucket.n += 1;
      bucket.total += value;
    }
  }
  return new Map(
    [...sums.entries()].map(([slug, bucket]) => [
      slug,
      { n: bucket.n, mean: bucket.n ? bucket.total / bucket.n : null },
    ]),
  );
}

function viewFor(rows: RatingRow[], pickRows: SqlPickRow[], vicOnly: boolean): IssuesView {
  const n = rows.length;
  const showRank = n >= CROWD_RANK_MIN;
  const means = meanMap(rows);
  const issues: IssueCrowd[] = RATE_SLUGS.map((slug) => {
    const stats = means.get(slug) ?? { n: 0, mean: null };
    const pickCounts: Record<string, number> = {};
    let nPicks = 0;
    for (const row of pickRows) {
      if (row.issue_slug !== slug) continue;
      const count = vicOnly ? row.vic : row.n;
      if (!count) continue;
      pickCounts[row.chosen] = (pickCounts[row.chosen] ?? 0) + count;
      nPicks += count;
    }
    return {
      slug,
      nRated: stats.n,
      mean: stats.mean,
      rank: null,
      nPicks,
      pickCounts,
      showPicks: COMPARE_SLUGS.includes(slug) && nPicks >= PICK_SPLIT_MIN,
    };
  });
  const order = [...issues].sort((a, b) => {
    const meanA = a.mean ?? -1;
    const meanB = b.mean ?? -1;
    if (meanB !== meanA) return meanB - meanA;
    if (b.nRated !== a.nRated) return b.nRated - a.nRated;
    return a.slug.localeCompare(b.slug);
  });
  if (showRank) order.forEach((item, index) => { item.rank = index + 1; });
  return { n, showRank, issues };
}

export function summariseIssuesMonth(
  month: string,
  ratingRows: RatingRow[],
  pickRows: SqlPickRow[],
): IssuesMonthResults {
  const vicRatings = ratingRows.filter((row) => row.state === 'VIC');
  return {
    month,
    everywhere: viewFor(ratingRows, pickRows, false),
    victoria: viewFor(vicRatings, pickRows, true),
  };
}

export function crowdBlindSpot(view: IssuesView, top3: string[]): string | null {
  if (!view.showRank) return null;
  const ranked = [...view.issues].filter((item) => item.rank != null).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return ranked.find((item) => !top3.includes(item.slug))?.slug ?? null;
}


