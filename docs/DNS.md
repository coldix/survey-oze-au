# DNS

## What is live

| Name | Where | Notes |
|---|---|---|
| `survey.oze.net.au` | Cloudflare zone `oze.net.au` on **Colin@oze.com.au** | Worker custom domain. Use this URL. |
| `survey.oze.au` | Hostinger zone `oze.au` | `CNAME survey → survey.oze.net.au` (same shape as `calibr`). Resolves; **HTTPS cert will not issue** until `oze.au` is a Cloudflare zone. Do not change nameservers for `oze.au`. |

## Hostinger row that is correct

| Type | Name | Priority | Target | TTL |
|---|---|---|---|---|
| CNAME | `survey` | 0 | `survey.oze.net.au` | 300 |

Name must be `survey`, not `@`. `@` is the oze.au hub (`ALIAS` / CNAME to `oze.au.cdn.hstgr.net`). Do not point `@` at the survey Worker.

There is no `.web.app` target. Calibr is Firebase; this site is a Cloudflare Worker.

## Snapshot

[`oze.au-dns.txt`](oze.au-dns.txt) is a Hostinger export from 18 Aug 2026, before the `survey` CNAME. It is a reference, not the live zone.
