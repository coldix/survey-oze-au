import { BLIND_CLAIMS, ISSUE_SET, MATRIX_HASH } from '../data/vic-issues-claims';
import { COMPARE_ISSUES, type RoundIssue } from './issues-survey';
import { shuffle } from './shuffle';
import { isPickParty, type PickParty } from './issues-math';

const PARTIES: PickParty[] = ['grn', 'alp', 'lnp', 'onp'];

export { MATRIX_HASH, ISSUE_SET };

export type ShownOrder = Record<string, PickParty[]>;

export function buildRound(existing?: ShownOrder): { shown: ShownOrder; issues: RoundIssue[] } {
  const shown: ShownOrder = {};
  const issues: RoundIssue[] = [];
  for (const slug of ISSUE_SET) {
    const saved = existing?.[slug];
    const order =
      Array.isArray(saved) && saved.length === 4 && saved.every(isPickParty) ? saved : shuffle(PARTIES);
    shown[slug] = order;
    const meta = COMPARE_ISSUES.find((issue) => issue.slug === slug);
    const claims = BLIND_CLAIMS[slug];
    if (!meta || !claims) continue;
    issues.push({
      slug,
      name: meta.name,
      chip: meta.chip,
      summary: meta.summary,
      options: order.map((party) => claims[party]),
    });
  }
  return { shown, issues };
}

export function parseShown(raw: string): ShownOrder | null {
  try {
    const parsed = JSON.parse(raw) as ShownOrder;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}
