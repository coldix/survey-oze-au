#!/usr/bin/env node
/**
 * Refresh the committed Vic 2026 issue snapshot from the elections checkout.
 * Does not run at `astro build`. Use --write to update, --verify to fail on drift.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const surveyRoot = resolve(here, '..');
const outFile = resolve(surveyRoot, 'src/data/vic-issues.ts');
const electionsRoot = resolve(process.env.ELECTIONS_ROOT ?? resolve(surveyRoot, '../../elections'));

const JURISDICTION_CHIP = {
  state_primary: 'State',
  shared_fed_state: 'Shared',
  federal_primary: 'Federal',
  local_primary: 'Local',
  shared_state_local: 'State / local',
};

function coalitionHeadline(cell) {
  if (!cell?.has_policy) return null;
  if (cell.scope === 'coalition_shared') return cell.policy?.headline ?? null;
  const parts = [
    ['Liberal', cell.member_policies?.liberal],
    ['Nationals', cell.member_policies?.nationals],
  ]
    .filter(([, policy]) => policy)
    .map(([label, policy]) => `${label}: ${policy.headline}`);
  if (parts.length) return parts.join(' · ');
  return cell.policy?.headline ?? null;
}

function partyHeadline(party, cell) {
  if (party === 'coalition') return coalitionHeadline(cell);
  return cell?.headline ?? null;
}

function render(issues) {
  return `/** Committed snapshot of Vic 2026 matrix issues. Refresh with \`node scripts/sync-issues.mjs --write\`. */
export type Jurisdiction = 'state_primary' | 'shared_fed_state' | 'federal_primary' | 'local_primary' | 'shared_state_local';

export type DisplayPartyId = 'greens' | 'labor' | 'coalition' | 'one-nation';

export type VicIssue = {
  slug: string;
  name: string;
  summary: string;
  jurisdiction: Jurisdiction;
  chip: string;
  comparisonUrl: string;
  headlines: Record<DisplayPartyId, string | null>;
};

export const VIC_ISSUES: VicIssue[] = ${JSON.stringify(issues, null, 2)};
`;
}

const args = new Set(process.argv.slice(2));
const { matrixFor } = await import(resolve(electionsRoot, 'scripts/lib/policies.mjs'));
const matrix = matrixFor('vic2026');
const view = matrix.combined;
if (!view) throw new Error('No combined matrix view.');

const issues = view.rows.map((row) => ({
  slug: row.issue.slug,
  name: row.issue.name,
  summary: row.issue.summary,
  jurisdiction: row.issue.jurisdiction,
  chip: JURISDICTION_CHIP[row.issue.jurisdiction] ?? row.issue.jurisdiction,
  comparisonUrl: `https://electiontracker.au/elections/vic/2026/policies/${row.issue.slug}`,
  headlines: {
    greens: partyHeadline('greens', row.cells.greens),
    labor: partyHeadline('labor', row.cells.labor),
    coalition: partyHeadline('coalition', row.cells.coalition),
    'one-nation': partyHeadline('one-nation', row.cells['one-nation']),
  },
}));

if (issues.length !== 15) throw new Error(`Expected 15 issues, got ${issues.length}`);
const next = render(issues);

if (args.has('--verify')) {
  let current = '';
  try {
    current = readFileSync(outFile, 'utf8');
  } catch {
    console.error(`Missing ${outFile}`);
    process.exit(1);
  }
  if (current !== next) {
    console.error('src/data/vic-issues.ts is out of date. Run: node scripts/sync-issues.mjs --write');
    process.exit(1);
  }
  console.log('vic-issues snapshot matches the elections matrix.');
  process.exit(0);
}

if (args.has('--write')) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, next);
  console.log(`Wrote ${issues.length} issues to src/data/vic-issues.ts`);
  process.exit(0);
}

console.log('Usage: node scripts/sync-issues.mjs --write | --verify');
process.exit(1);
