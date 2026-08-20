#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: root }).trim();
  } catch {
    return null;
  }
}

const now = new Date();
const aest = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZoneName: 'short',
}).format(now);

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Melbourne',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
  .formatToParts(now)
  .reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

const sha = sh('git rev-parse --short HEAD') || 'unknown';
const shaFull = sh('git rev-parse HEAD');
const dirty = Boolean(sh('git status --porcelain'));
const ymd = `${parts.year}${parts.month}${parts.day}`;
const hm = `${parts.hour}${parts.minute}`;
const version = `${ymd}.${hm}-aest+${sha}${dirty ? '-dirty' : ''}`;

const meta = {
  version,
  git_sha: sha,
  git_sha_full: shaFull,
  git_dirty: dirty,
  built_at_utc: now.toISOString(),
  built_at_aest: aest,
};

const outFile = join(root, 'src/data/build-meta.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(meta, null, 2) + '\n');
writeFileSync(join(root, 'public/build-meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`build-meta: ${version} (${aest})`);
