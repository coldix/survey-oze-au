# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

`survey.oze.au` — a reusable survey platform for the oze.au family. Astro static
site + a Cloudflare Worker + D1. Two live surveys: a monthly Victorian/federal
voting poll, and "Money in Your Wallet" (a banknote quiz).

**Canonical host is `https://survey.oze.net.au`.** `survey.oze.au` is a Hostinger
CNAME that resolves but has **no HTTPS certificate** — Cloudflare will not issue
one while the `oze.au` nameservers stay at Hostinger. Never put `survey.oze.au`
in a canonical, sitemap, JSON-LD, or share string. See `docs/DNS.md`.

## Commands

```bash
npm install
npm run db:local     # apply migrations to LOCAL D1 — do this before cf:dev
npm run dev          # astro dev — UI only, /api/* does NOT exist
npm run cf:dev       # build + wrangler dev — Worker + assets + local D1
npm run check        # astro check (TypeScript) — the only automated gate
npm run cf:types     # regenerate worker-configuration.d.ts (gitignored)
```

There is **no test suite**. `npm run check` is the whole verification story, so
run it before committing anything that touches `src/`.

Anything exercising `/api/*`, D1, or the poll needs `cf:dev`. `npm run dev`
serves pages only — the Worker isn't in the loop, so API calls 404.

## Cloudflare account — get this wrong and you deploy to the wrong place

```bash
npx wrangler whoami   # MUST show Colin@oze.com.au
```

| | |
|---|---|
| Account | **Colin@oze.com.au** (`1b494ec3de3d84b846e3100f5bbf561d`) |
| Worker | `survey-oze-au` |
| D1 | `survey-responses` (`4d299038-e4a0-44fb-9b0b-d5fd1ec4b4a2`, region OC) |

Do **not** deploy from the ShadeSale account (`Ss@oze.com.au`) or the
evidence-sites account (`Col@oze.com.au`). `workers_dev` is off and this account
has no `workers.dev` subdomain — the Worker only answers on `survey.oze.net.au`.

Deploy (only when asked):

```bash
npm run build
npx wrangler d1 migrations apply survey-responses --remote
npx wrangler deploy
```

## Architecture

- **Astro is `output: 'static'`, `trailingSlash: 'never'`.** Pages build to `dist/`.
- **The Worker (`src/worker.ts`) runs first** (`run_worker_first: true` in
  `wrangler.jsonc`), handles `/api/*`, and falls through to `env.ASSETS.fetch()`
  for everything else. There is no Astro SSR adapter — don't add server endpoints
  under `src/pages/`; API routes go in `src/worker.ts`.
- **D1 binding is `DB`.** Migrations in `migrations/`, applied by wrangler.

| Route | Role |
|---|---|
| `POST /api/submit` | Money survey answers |
| `GET /api/stats/:slug` | Money community stats |
| `POST /api/poll/submit` | Monthly poll (window + bot + rate checks) |
| `GET /api/poll/results` | Monthly pies + by-state table |

## Adding a survey

1. Write the definition in `src/data/<slug>.ts` as a `SurveyDefinition`
   (`src/lib/types.ts`).
2. Register it in the `surveys` array in `src/lib/surveys.ts`.

That's it — `src/pages/s/[slug].astro` generates the page via `getStaticPaths()`,
and `src/components/SurveyRunner.tsx` renders it. Scoring is generic
(`src/lib/score.ts`); questions with `scored: true` and a `correct` value count.

Note `[slug].astro` **special-cases `money`** (`const isMoney = ...`) for its
title, description, FAQ, and `LearningResource`/`Quiz` JSON-LD. A new survey
falls back to generic `WebPage` metadata — extend that branch if it needs more.

## The monthly poll is not a normal survey

It has its own page (`src/pages/s/monthly-poll.astro`), its own React app
(`MonthlyPollApp.tsx`), its own table, and its own endpoints. It is **not** in
the `surveys` array.

- **Window** (`src/lib/poll-window.ts`): open 18 Aug 2026 → 28 Nov 2026 (Victorian
  election day), evaluated in `Australia/Melbourne`. Submissions outside it are
  rejected 403. The date constants `SERIES_START` / `SERIES_END` are hardcoded.
- **One response per person per calendar month**, deduped on `client_hash`
  (SHA-256 of `monthly-poll:<month>:<clientId>`) **or** `ip_hash`.
- **Rate limit**: 8 attempts per IP hash per hour (`poll_rate` table).
- **August starter votes are code, not data.** `src/lib/poll-seed.ts` holds a
  start count of 1000 split to the Election Tracker average, added on top of live
  rows at render time. There are no seed rows in D1 — do not try to "fix" the
  August numbers with SQL. (The gitignored `scripts/seed-*` paths are abandoned.)
- Party keys, labels and chart colours live in `src/lib/poll-math.ts`. Keep
  `PARTY_KEYS` and the DB values in sync.

## Conventions

- **All user-facing copy, SEO metadata and FAQs live in `src/lib/site.ts`** —
  titles, descriptions, JSON-LD builders, share text. Change copy there, not in
  the templates.
- Keep `docs/` current when behaviour changes: `DEPLOYMENT.md`, `POLL.md`,
  `DNS.md`, `SEO.md`. `docs/SEO.md` has an honest "Not done" section — respect it
  rather than claiming things are in place.
- Australian English and `en-AU` throughout. Dates as `28 November 2026`.
- `README.md` uses an HTML comment header block (File/Website/Description/
  Version/Date/Author). Source files do not — don't add headers to `src/`.

## Gotchas

- **README says "Astro 5"; `package.json` pins `astro ^7.2.1`.** The README is
  stale on this point. Trust `package.json`.
- `worker-configuration.d.ts` is generated and gitignored — regenerate with
  `npm run cf:types` if `Env` types look wrong, don't hand-edit.
- `docs/oze.au-dns.txt` is a snapshot from 18 Aug 2026 taken *before* the survey
  CNAME was added. Reference only, not the live zone.
- Cloudflare prepends a managed robots block on the `oze.net.au` zone that asks
  AI training crawlers not to crawl. Our `public/robots.txt` is appended after it.
