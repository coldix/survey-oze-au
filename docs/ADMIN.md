# Admin dashboard

**URL:** https://survey.oze.net.au/admin  
Not linked from the public nav. `noindex`.

Sign-in is a 6-digit code emailed to an allowlisted address (`ADMIN_EMAILS` in `wrangler.jsonc`: `col@dixon.au`, `colin@oze.com.au`).

## One-time setup

```bash
openssl rand -hex 32 | npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler email sending enable oze.net.au
npx wrangler d1 migrations apply survey-responses --remote
npx wrangler deploy
```

Codes are sent from `surveys@oze.net.au`. The sending domain must be onboarded on the **Colin@oze.com.au** account.

Local wrangler (`127.0.0.1`) returns `debugCode` in the login JSON if email sending is unavailable.

## What it can do

- List monthly-poll, vic-issues, and money responses with IP, country, ASN, bot score, user-agent
- Auto-flag suspicious rows (low bot score, non-AU, missing IP/UA, rushed comparison taps)
- Manual flag / unflag / delete
- Set open/close dates (Melbourne calendar dates)
- Archive (close without deleting) and restart the current period (deletes current-month live rows)
