# SEO and AI

What is actually in place on **https://survey.oze.net.au** (18 Aug 2026). This is not a full Search Console / Lighthouse programme.

Canonical host is `survey.oze.net.au`. `survey.oze.au` CNAME exists but has no Cloudflare certificate — do not use it in canonicals, sitemaps, or share text.

## Done

### Every page (`BaseLayout.astro`)

- `lang="en-AU"`
- Unique `<title>` and meta description (poll page custom; Money uses quiz title + subtitle; home uses site defaults)
- `robots`: `index, follow, max-image-preview:large`
- Canonical URL on `https://survey.oze.net.au` (Astro `site` + `trailingSlash: never`)
- Open Graph: type, site_name, locale `en_AU`, title, description, url, image (`/images/oze-logo.png`)
- Twitter `summary` card
- Link to `/llms.txt` as `rel="alternate"` so agents can find the AI guide
- Skip link, semantic `header` / `main` / `footer`

### Monthly poll (`/s/monthly-poll`) — strongest page

- Title and description name Victoria 2026, federal 2028, and electiontracker.au
- JSON-LD `WebPage` (event: Vic election 28 Nov 2026, `relatedLink` to Election Tracker)
- JSON-LD `FAQPage` from the same `POLL_FAQ` list as the visible FAQ
- FAQ is **in the HTML** (not only in the React form), so Google and models can read it without JS
- `<noscript>` share URL
- Human FAQ: scientific-poll caveat, what is asked, Election Tracker, one vote/month, postcode, what data we keep

### AI crawlers

`public/robots.txt` allows `*` plus GPTBot, ClaudeBot, PerplexityBot, Google-Extended. Points at the sitemap and `llms.txt`.

`public/llms.txt` is a short machine brief: live host, poll rules, not-a-forecast, Election Tracker link, Money quiz, repo.

Astro `@astrojs/sitemap` writes `sitemap-index.xml` / `sitemap-0.xml` for `/`, `/s/monthly-poll`, `/s/money`, `/404`.

### Social

Share block + copy-to-clipboard on the poll page. Copy is also in `docs/POLL.md` and `src/lib/site.ts` (`POLL_SOCIAL_COPY`).

## Not done (honest gaps)

| Gap | Why it matters |
|---|---|
| OG image is the small oze logo, not 1200×630 | Slack/Facebook cards will look thin |
| Poll **form** is `client:only` React | Crawlers see title, FAQ, and links, not the question list, unless they run JS |
| Money page has no FAQPage / Quiz JSON-LD | Weaker than the poll page |
| Home page uses generic title/description | Fine as a hub, not a target query |
| No Search Console / IndexNow / Bing | Discovery is organic + links only |
| `survey.oze.au` HTTPS | Cannot be the public URL until the parent zone is on Cloudflare |

## How to check

```bash
curl -sS https://survey.oze.net.au/s/monthly-poll | grep -E 'canonical|og:title|FAQPage|llms.txt'
curl -sS https://survey.oze.net.au/llms.txt
curl -sS https://survey.oze.net.au/robots.txt
curl -sS https://survey.oze.net.au/sitemap-index.xml
```
