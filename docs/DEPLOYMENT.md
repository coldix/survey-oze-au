# Deployment

## Account

| Item | Value |
|---|---|
| Cloudflare account | **Colin@oze.com.au** (`1b494ec3de3d84b846e3100f5bbf561d`) |
| Worker | `survey-oze-au` |
| Live hostname | `survey.oze.net.au` |
| D1 | `survey-responses` (`4d299038-e4a0-44fb-9b0b-d5fd1ec4b4a2`, region OC) |

Do **not** deploy from the ShadeSale account (`Ss@oze.com.au`) or the evidence-sites account (`Col@oze.com.au`).

## Commands

From `~/web/oze-sites/survey`:

```bash
npx wrangler whoami          # must show Colin@oze.com.au
npm run build
npx wrangler d1 migrations apply survey-responses --remote
npx wrangler deploy
```

`workers_dev` is off. This account has no `workers.dev` subdomain. The Worker only answers on `survey.oze.net.au`.

## Bindings

See `wrangler.jsonc`. The Worker handles `/api/*` first (`run_worker_first`), then static assets from `dist/`.

| Path | Role |
|---|---|
| `POST /api/submit` | Money survey answers |
| `GET /api/stats/:slug` | Money community stats |
| `POST /api/poll/submit` | Monthly poll (window + bot checks) |
| `GET /api/poll/results` | Monthly pies + by-state table |

## Migrations

| File | What |
|---|---|
| `0001_responses.sql` | Money `responses` |
| `0002_poll_responses.sql` | Monthly `poll_responses` |
| `0003_poll_security.sql` | IP / UA / rate-limit columns |
| `0004_poll_source.sql` | `source` (`live` vs unused `seed`) |

August starter votes are **not** D1 rows. They are a coded start count in `src/lib/poll-seed.ts`.
