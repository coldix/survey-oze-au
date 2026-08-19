# SEO and AI

What is actually in place on **https://survey.oze.net.au** (18 Aug 2026). This is not a Search Console / Lighthouse programme.

Canonical host is `survey.oze.net.au`. `survey.oze.au` CNAME exists but has no Cloudflare certificate — do not use it in canonicals, sitemaps, or share text.

## Done

### Every page (`BaseLayout.astro`)

- `lang="en-AU"`
- Unique `<title>` and meta description
- `robots`: `index, follow, max-image-preview:large` (404 is `noindex, follow`)
- Canonical URL on `https://survey.oze.net.au` (`trailingSlash: never`)
- Author, theme-color, favicon, apple-touch-icon, web manifest
- Open Graph: type, site_name, locale `en_AU`, title, description, url, **1200×630** `/images/og.jpg`
- Twitter `summary_large_image`
- `<link rel="sitemap">` → `/sitemap-index.xml`
- `<link rel="alternate">` → `/llms.txt`
- `<link rel="author">` → `/humans.txt`
- Skip link, semantic `header` / `main` / `footer`
- Header + footer links to Poll and Money so crawlers do not depend on the home cards

### Home (`/`)

- Title and description name the voting poll and the banknote quiz
- JSON-LD `WebSite`, `CollectionPage` + `ItemList`, `BreadcrumbList`, `FAQPage`
- FAQ is in the HTML

### Monthly poll (`/s/monthly-poll`)

- Title and description name Victoria 2026, federal 2028, and electiontracker.au
- JSON-LD `WebSite`, `WebPage` (event: Vic election 28 Nov 2026, `relatedLink` to Election Tracker), `BreadcrumbList`, `FAQPage`
- FAQ is in the HTML (not only in the React form)
- `<noscript>` share URL

### Money quiz (`/s/money`)

- Title and description name polymer banknotes, colours, portraits, new $5
- JSON-LD `LearningResource`/`Quiz` (no answer spoilers), `BreadcrumbList`, `FAQPage`
- Crawler-visible “About this survey” + FAQ in the HTML
- Quiz runner still hydrates for the scored attempt

### Discovery files

| Path | Role |
|---|---|
| `/robots.txt` | Allows search (`*`, Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Applebot). `Disallow: /api/`. Points at the sitemap. **Cloudflare on the `oze.net.au` zone prepends a managed block** for training crawlers (GPTBot, ClaudeBot, Google-Extended, …) with `search=yes, ai-train=no`. Our file is appended after that. |
| `/sitemap-index.xml` | Astro `@astrojs/sitemap` — `/`, `/s/monthly-poll`, `/s/money`. **404 is filtered out.** |
| `/llms.txt` | Machine brief: canonical host, poll rules, quiz, Election Tracker, repo |
| `/humans.txt` | Author / contact |
| `/site.webmanifest` | Name, theme, icon |

Poll sitemap priority `1.0` daily; home `0.9` weekly; other surveys `0.8` monthly.

### Social

Share block + copy-to-clipboard on the poll page (`POLL_SOCIAL_COPY`). OG card is `public/images/og.jpg`.

## Not done (honest gaps)

| Gap | Why it matters |
|---|---|
| No Search Console / IndexNow / Bing | Discovery is organic + links only |
| Poll **form** is `client:only` React | Crawlers see title, FAQ, and links, not the question list, unless they run JS |
| `survey.oze.au` HTTPS | Cannot be the public URL until the parent zone is on Cloudflare |
| CF managed robots on `oze.net.au` | Training bots are asked not to crawl. Turn off in the zone Security settings if you want GPTBot/ClaudeBot to read the site. |

## How to check

```bash
curl -sSI https://survey.oze.net.au/ | grep -i location
curl -sS https://survey.oze.net.au/ | grep -E 'canonical|og:image|WebSite|FAQPage|llms.txt|sitemap'
curl -sS https://survey.oze.net.au/s/money | grep -E 'canonical|Quiz|FAQPage|About this survey'
curl -sS https://survey.oze.net.au/robots.txt
curl -sS https://survey.oze.net.au/sitemap-index.xml
curl -sS https://survey.oze.net.au/sitemap-0.xml
curl -sS https://survey.oze.net.au/llms.txt
```
