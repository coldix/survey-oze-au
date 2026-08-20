import {
  CROWD_RANK_MIN,
  ISSUE_SLUGS,
  PICK_OPTIONS,
  PICK_SPLIT_MIN,
  type IssuesAnswers,
  type PickId,
} from './issues-survey';

export type IssuesRow = {
  state: string | null;
  answers: IssuesAnswers;
};

export type IssueCrowd = {
  slug: string;
  nRated: number;
  mean: number | null;
  rank: number | null;
  top3n: number;
  pickCounts: Record<PickId, number>;
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

const EMPTY_PICKS = (): Record<PickId, number> =>
  Object.fromEntries(PICK_OPTIONS.map((option) => [option.id, 0])) as Record<PickId, number>;

export function isVictoriaRow(row: IssuesRow): boolean {
  return row.state === 'VIC';
}

function viewFor(rows: IssuesRow[]): IssuesView {
  const n = rows.length;
  const showRank = n >= CROWD_RANK_MIN;
  const issues: IssueCrowd[] = ISSUE_SLUGS.map((slug) => {
    const scores: number[] = [];
    const pickCounts = EMPTY_PICKS();
    let top3n = 0;
    for (const row of rows) {
      const score = row.answers.ratings[slug];
      if (typeof score === 'number') scores.push(score);
      if (row.answers.top3.includes(slug)) {
        top3n += 1;
        const pick = row.answers.picks[slug];
        if (pick && pick in pickCounts) pickCounts[pick] = (pickCounts[pick] ?? 0) + 1;
      }
    }
    return {
      slug,
      nRated: scores.length,
      mean: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
      rank: null,
      top3n,
      pickCounts,
      showPicks: top3n >= PICK_SPLIT_MIN,
    };
  });

  const order = [...issues].sort((a, b) => {
    const meanA = a.mean ?? -1;
    const meanB = b.mean ?? -1;
    if (meanB !== meanA) return meanB - meanA;
    if (b.nRated !== a.nRated) return b.nRated - a.nRated;
    return a.slug.localeCompare(b.slug);
  });
  if (showRank) {
    order.forEach((item, index) => {
      item.rank = index + 1;
    });
  }

  return { n, showRank, issues };
}

export function summariseIssuesMonth(month: string, rows: IssuesRow[]): IssuesMonthResults {
  return {
    month,
    everywhere: viewFor(rows),
    victoria: viewFor(rows.filter(isVictoriaRow)),
  };
}

export function crowdBlindSpot(view: IssuesView, top3: string[]): string | null {
  if (!view.showRank) return null;
  const ranked = [...view.issues].filter((item) => item.rank != null).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return ranked.find((item) => !top3.includes(item.slug))?.slug ?? null;
}
