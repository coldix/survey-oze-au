#!/usr/bin/env node
/**
 * Refresh committed Vic 2026 issue snapshots from the elections checkout.
 * Public snapshot has no party claims (safe for the client bundle).
 * Claims snapshot is worker-only. Use --write or --verify.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const surveyRoot = resolve(here, '..');
const publicFile = resolve(surveyRoot, 'src/data/vic-issues.ts');
const claimsFile = resolve(surveyRoot, 'src/data/vic-issues-claims.ts');
const electionsRoot = resolve(process.env.ELECTIONS_ROOT ?? resolve(surveyRoot, '../../elections'));

const JURISDICTION_CHIP = {
  state_primary: 'State',
  shared_fed_state: 'Shared',
  federal_primary: 'Federal',
  local_primary: 'Local',
  shared_state_local: 'State / local',
};

function coalitionClaim(cell) {
  if (!cell?.has_policy) return null;
  return (
    cell.policy?.blind_claim ??
    cell.member_policies?.liberal?.blind_claim ??
    cell.member_policies?.nationals?.blind_claim ??
    null
  );
}

function partyClaim(party, cell) {
  if (party === 'coalition') return coalitionClaim(cell);
  return cell?.blind_claim ?? null;
}

function renderPublic(issues) {
  return `/** Public snapshot — no party claims. Refresh with \`node scripts/sync-issues.mjs --write\`. */
export type Jurisdiction = 'state_primary' | 'shared_fed_state' | 'federal_primary' | 'local_primary' | 'shared_state_local';

export type VicIssue = {
  slug: string;
  name: string;
  summary: string;
  jurisdiction: Jurisdiction;
  chip: string;
  rated: boolean;
  compared: boolean;
  comparisonUrl: string;
};

export const VIC_ISSUES: VicIssue[] = ${JSON.stringify(issues, null, 2)};
`;
}

function renderClaims(payload) {
  return `/** Worker-only claims. Do not import from React islands. */
export type ClaimParty = 'grn' | 'alp' | 'lnp' | 'onp';

export const MATRIX_HASH = ${JSON.stringify(payload.hash)};

export const ISSUE_SET = ${JSON.stringify(payload.issueSet)} as const;

export const BLIND_CLAIMS: Record<string, Record<ClaimParty, string>> = ${JSON.stringify(payload.claims, null, 2)};
`;
}

const args = new Set(process.argv.slice(2));
const { matrixFor } = await import(resolve(electionsRoot, 'scripts/lib/policies.mjs'));
const matrix = matrixFor('vic2026');
const view = matrix.combined;
if (!view) throw new Error('No combined matrix view.');

const issues = view.rows.map((row) => {
  const rated = row.issue.jurisdiction !== 'federal_primary';
  const claims = {
    greens: partyClaim('greens', row.cells.greens),
    labor: partyClaim('labor', row.cells.labor),
    coalition: partyClaim('coalition', row.cells.coalition),
    'one-nation': partyClaim('one-nation', row.cells['one-nation']),
  };
  const complete = Object.values(claims).every(Boolean);
  const compared = rated && row.issue.differentiated === true;
  if (compared && !complete) {
    throw new Error(`${row.issue.slug} is differentiated but missing a blind_claim on a display column`);
  }
  return {
    slug: row.issue.slug,
    name: row.issue.name,
    summary: row.issue.summary,
    jurisdiction: row.issue.jurisdiction,
    chip: JURISDICTION_CHIP[row.issue.jurisdiction] ?? row.issue.jurisdiction,
    rated,
    compared,
    comparisonUrl: `https://electiontracker.au/elections/vic/2026/policies/${row.issue.slug}`,
    _claims: claims,
  };
});

const publicIssues = issues.map(({ _claims, ...rest }) => rest);
const rated = publicIssues.filter((issue) => issue.rated);
const compared = publicIssues.filter((issue) => issue.compared);
if (rated.length !== 14) throw new Error(`Expected 14 rated issues, got ${rated.length}`);
if (compared.length !== 10) throw new Error(`Expected 10 compared issues, got ${compared.length}`);

const issueSet = compared.map((issue) => issue.slug);
const claims = {};
for (const issue of issues.filter((item) => item.compared)) {
  claims[issue.slug] = {
    grn: issue._claims.greens,
    alp: issue._claims.labor,
    lnp: issue._claims.coalition,
    onp: issue._claims['one-nation'],
  };
}
const hash = createHash('sha256').update(JSON.stringify({ issueSet, claims })).digest('hex');
const publicNext = renderPublic(publicIssues);
const claimsNext = renderClaims({ hash, issueSet, claims });

if (args.has('--verify')) {
  const ok =
    readFileSync(publicFile, 'utf8') === publicNext && readFileSync(claimsFile, 'utf8') === claimsNext;
  if (!ok) {
    console.error('Issue snapshots are out of date. Run: node scripts/sync-issues.mjs --write');
    process.exit(1);
  }
  console.log(`vic-issues snapshot ok · 14 rated · 10 compared · hash ${hash.slice(0, 12)}`);
  process.exit(0);
}

if (args.has('--write')) {
  mkdirSync(dirname(publicFile), { recursive: true });
  writeFileSync(publicFile, publicNext);
  writeFileSync(claimsFile, claimsNext);
  console.log(`Wrote 14 rated / 10 compared issues · hash ${hash.slice(0, 12)}`);
  process.exit(0);
}

console.log('Usage: node scripts/sync-issues.mjs --write | --verify');
process.exit(1);
