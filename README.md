<!--
    File: /README.md
    Website: survey.oze.net.au
    Description: Reusable Astro + Cloudflare survey platform
    Version: 0.2.0
    Date: 18 Aug 2026
    Author: Colin Dixon
-->
# survey.oze.au

Reusable surveys for the oze.au family. Live host: **https://survey.oze.net.au**

The July 2026 static HTML prototype is gone. This repo is Astro 5 + a Cloudflare Worker + D1.

| URL | What |
|---|---|
| https://survey.oze.net.au | Home |
| https://survey.oze.net.au/s/monthly-poll | Monthly Vic + federal voting poll |
| https://survey.oze.net.au/s/vic-issues | Victoria 2026 issues (rank + closest policy) |
| https://survey.oze.net.au/s/money | Money in Your Wallet (currency quiz) |

`survey.oze.au` has a Hostinger CNAME to `survey.oze.net.au`. HTTPS on that name is **not** live — Cloudflare will not issue a cert while `oze.au` nameservers stay at Hostinger. Use the `.net.au` URL.

## Stack

- Astro 5 (static pages) + React islands
- Cloudflare Worker (`survey-oze-au`) on account **Colin@oze.com.au**
- Custom domain `survey.oze.net.au` (zone `oze.net.au`)
- D1 `survey-responses` (OC)

## Local

```bash
cd ~/web/oze-sites/survey
npm install
npm run db:local
npm run dev          # UI only
npm run cf:dev       # Worker + assets + local D1
```

Wrangler must be logged into **Colin@oze.com.au**, not ShadeSale (`Ss@`) and not `Col@`.

```bash
npx wrangler whoami
```

## Deploy

```bash
npm run build
npx wrangler d1 migrations apply survey-responses --remote
npx wrangler deploy
```

## Docs

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — account, D1, deploy
- [docs/POLL.md](docs/POLL.md) — monthly voting poll
- [docs/ISSUES.md](docs/ISSUES.md) — Victoria 2026 issues survey
- [docs/DNS.md](docs/DNS.md) — Hostinger + Cloudflare hostnames
- [docs/SEO.md](docs/SEO.md) — SEO and AI (what is live, what is not)

## Repo

https://github.com/coldix/survey-oze-au
