<!--
    File: docs/PLAYBOOK.md
    Project: oze.au — the family playbook (canonical source of truth)
    Web site by: Colin Dixon BSc, DipEd, Cert IV TAE  +  Claude Opus 4.8
    Phone: 0419 415 000 · Email: col@dixon.au
    Website: https://oze.au · Canonical: https://oze.au/docs/PLAYBOOK.md
    Version: 1.0.2
    Date: 23 Jun 2026 | 8:10 PM AEST
-->
# Oze.au Subdomain Playbook

How to build / upgrade an `oze.au` subdomain to the house standard, fast.
Distilled from the family:
- **`oze.au`** — the root **hub** ([coldix/oze.au](https://github.com/coldix/oze.au)) — this repo.
- **`domains.oze.au`** — care plans, payments, globe animation ([coldix/domains](https://github.com/coldix/domains)).
- **`celebrate.oze.au`** — most config-driven sibling ([coldix/celebrate-oze-au](https://github.com/coldix/celebrate-oze-au)).

Read this first when starting a new subdomain or levelling up an old one — it
exists so we don't relearn the same lessons each time. For oze.au-specific
detail see the sibling docs: [ARCHITECTURE](ARCHITECTURE.md),
[DEPLOYMENT](DEPLOYMENT.md), [DESIGN_SYSTEM](DESIGN_SYSTEM.md),
[BEST_PRACTICES](BEST_PRACTICES.md).

> **Source of truth: this file** (`oze.au/docs/PLAYBOOK.md`). The playbook evolves
> here — check it when starting work on any oze.au project, and update it here when
> you learn something new. Other repos may keep a copy, but this is canonical.

## Before you start — establish source of truth

Work happens across two machines (Mac Studio + MacBook Air), so the **local
working tree is not authoritative — `origin/main` is.** Before editing *any* repo,
run a pre-flight and reconcile first. Never build on a stale base (this is how the
`music` upgrade nearly clobbered a redesign that only existed on the remote).

```bash
git fetch origin
git status -sb                                   # branch + ahead/behind line
git rev-list --left-right --count HEAD...@{u}    # local<TAB>upstream commit counts
git status --short                               # uncommitted + untracked (orphans)
```

Then act on what you find, **before** making changes:
- **Behind** (upstream ahead): the other machine pushed newer work →
  `git pull --ff-only`. Editing now would fork off an old base.
- **Diverged** (ahead *and* behind): rebase local onto origin
  (`git pull --rebase`) and resolve — never force-push over the other machine.
- **Uncommitted / untracked orphans present**: decide keep / commit / discard
  *first*. Don't bury someone's WIP under new edits. A stale `HEAD` with lots of
  uncommitted files usually means real work was authored on the other machine.
- Confirm the **latest version** matches: compare the `VERSION` constant / headers
  local vs `origin/main`; the most-recent on origin wins.
- Watch for a wedged auth header and stray secrets (see §3).

Quick multi-repo sweep (run from anywhere):
```bash
for d in ~/web/oze-sites/* ~/web/*; do
  [ -e "$d/.git" ] || continue
  git -C "$d" fetch -q origin 2>/dev/null
  printf '%s  %s\n' "$(git -C "$d" status -sb | head -1)" "$d"
done
```

### Where to work — persistent local clones, not `/tmp`

Keep a long-lived clone of each repo at `~/web/oze-sites/<name>` and **work there**.
Don't author changes in throwaway `/tmp` clones — they mask drift between the two
machines and leave the local tree stale. Each session:

1. `cd ~/web/oze-sites/<name>`, run the pre-flight above.
2. Reconcile **first** — `git pull --ff-only` (or `--rebase` if diverged).
3. Edit → `./bump-version.sh X.Y.Z` → commit → push → verify live.
4. On the *other* machine, `git pull` before working there.

`/tmp` is a fallback only (e.g. local has diverged badly and you want a clean
checkout to compare). The non-negotiable part is the pre-flight + reconcile, not
the directory. `origin/main` is always the source of truth.

## Hosting map — not every subdomain is a static Hostinger subfolder

Before touching a subdomain, know **what it actually is and where it lives**. The
house standard (static HTML/CSS/JS, semver headers/footer, `bump-version.sh`,
`--delete` rules) applies **only** to the static sites served from the hub
docroot. Others are different stacks and must NOT get the static treatment.

**The DNS record type tells you the architecture** (current zone:
[`docs/dns/oze.au.zone.txt`](dns/oze.au.zone.txt)):
- **`ALIAS … *.oze.au.cdn.hstgr.net`** → static site **inside the hub docroot**
  (`oze.au/public_html/<name>`). These are the ones the hub's `--delete` can wipe:
  `apps, art, bridge, calendar, domains, dots, music, ppp, wallplanner`
  (exactly the set that got nuked — confirmed).
- **`A 46.202.196.151`** → a **separate** Hostinger site with its own docroot
  (`acc, bellwest, chrismatterson, justsplits, ksrh, tunia`, `ftp`). NOT a hub
  subfolder → unaffected by the hub deploy.
- **`CNAME`/`A 199.36.158.x`** → hosted **off** Hostinger; DNS only points there.

| Subdomain | Stack | Hosted | Repo | Notes |
|---|---|---|---|---|
| calendar, music, domains, art, apps, bridge, ppp, wallplanner (ALIAS) | static HTML/CSS/JS | Hostinger, **subfolders of** `oze.au/public_html/` | `coldix/<name>` | full house standard; hub deploy **never** `--delete` |
| dots.oze.au (ALIAS) | **Flutter web** | Hostinger subfolder `public_html/dots` | `coldix/exploding-dots` | CI builds (`flutter build web`) then rsyncs `build/web/`; exempt from the header/footer/bump standard |
| calibr.oze.au (CNAME) | **Flutter app** | **Firebase Hosting** (`*.web.app`, NOT Hostinger) | `coldix/calibr` | DNS only; unaffected by any Hostinger deploy |
| hsa.oze.au (A 199.36.158.100 + `hosting-site` TXT) | **Firebase-hosted app** | **Firebase Hosting** (NOT Hostinger) | `coldix/house_sitting_australia` | major project. NB the separate domain `housesittingaustralia.au` is a **WordPress** site on Hostinger — different thing |
| acc, bellwest, chrismatterson, justsplits, ksrh, tunia (A) | various | Hostinger, **own docroots** | `coldix/<name>` | separate sites, not hub subfolders |

DNS for all of these is managed at Hostinger even when the app is hosted
elsewhere (Firebase). So a working DNS record does **not** mean it's a Hostinger
static subfolder — check the record type and the stack first.

## 0. The root hub: oze.au

`oze.au` is the front door — it must list and link **every** live subdomain and
stay current.

- **Design system:** "OzeGlass V2.0 — Aurora" (the canonical glass/theme spec).
  Its own docs are worth reading: `docs/DESIGN_SYSTEM.md`, `BEST_PRACTICES.md`,
  `ARCHITECTURE.md`, `DEPLOYMENT.md` in [coldix/oze.au](https://github.com/coldix/oze.au).
- **Animation:** drone 3D **parallax tilt** (hero image follows the pointer) plus
  a floating-**motes** canvas (`#motes`). This is oze.au's animation variant.
- **Hub upkeep — when you ship a new/changed subdomain, also update oze.au:**
  1. add/refresh its `.link-card` in `index.html`,
  2. add it to the JSON-LD `SiteNavigationElement` list,
  3. add it to `sitemap.xml` and `llms.txt`.
- **domains.oze.au links straight to the money page:** oze.au links directly to
  `https://domains.oze.au/websites.html` (Websites & Care), not just the root.

---

## 1. The standard stack

- **Pure HTML + CSS + JS.** No framework, no build step, no npm. Plain files the
  browser loads directly. Keep it that way unless a project truly needs more.
- **Shared `css/style.css` + `js/script.js`** (DRY). One stylesheet, one script,
  linked by every page with a `?v=` cache-buster.
- **Glassmorphism over a full-bleed background photo**, dark/light theme with
  `localStorage` persistence.
- **No backend.** Enquiries → formatted `mailto:` + copy-to-clipboard. Payments →
  Stripe Payment Links (hosted checkout, no server). Forms → Google Forms where a
  real submission store is needed (celebrate does this).
- **Deploy:** GitHub Actions → `rsync` over SSH → Hostinger subfolder.

## 2. House conventions (copy these every time)

- **File header** on every source file (comment chars vary by type — `<!-- -->`,
  `/* */`, `#`):
  ```
  File: /path
  Website: <sub>.oze.au
  Description: <one line>
  Version: X.Y.Z
  Date: dd Mon yyyy | h:mm AM/PM AEST
  Author: Colin Dixon + Claude Opus 4.8
  ```
  `Version:` is semver (`vMAJOR.MINOR.MICRO`), straight counting — the version is
  **never** date-based. `Date:` is a separate build-date field (date **and** time
  AEST). Both are machine-maintained — see the version/date policy below.
- **Footer** (rendered): copyright, rights, build stamp, credit, then legal links:
  ```
  © <year> Colin Dixon · All rights reserved · vX.Y.Z · dd Mon yyyy · Website by oze.au
  Privacy Policy · Terms of Use · Disclaimer
  ```
  (Footer date is date-only; the header carries the time.)
- **One version + date drive everything; never edit them by hand.** Each repo has
  ONE site version. `bump-version.sh` (see §4) rewrites the `Version:` AND `Date:`
  in *every* file plus the footer build stamp to the current version + today (AEST)
  on each bump. So all files always match and **nothing goes stale** — the script
  touches them all, not just the ones you edited. (A per-file `Version:` only
  updates when that file is touched, which is why we drive it from the script.)
- **SEO/AI baseline** on every subdomain: `robots.txt` (allow GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended, etc.), `sitemap.xml`, `llms.txt`, canonical +
  `og:`/`twitter:` tags, JSON-LD schema (Organization or the relevant type).

## 3. Hard-won lessons (the gotchas that cost time)

### Cache-buster bug — the expensive one
The asset query string is written `?v=2.5.0` (a `v=`, not `v2`). A naive
`sed 's/v2\.5\.0/.../'` **does not match it**, so version bumps silently fail and
every page keeps pointing browsers at the old, 1-year-immutable asset URL. The
result looks like "the CDN is caching" but it's the HTML referencing a stale
`?v=`. **Always bump with the script (§4), and verify live** with:
```bash
curl -s "https://SUB.oze.au/page.html?z=$RANDOM" | grep -o 'style.css?v=[0-9.]*'
```

### HTML must not be cached; assets should be
`.htaccess` sets `Cache-Control: no-store` on `*.html` (always fresh) and
1-year `immutable` on `css/js/images/fonts` (busted via `?v=`). This is the
correct combo — without it the edge serves stale pages.

### rsync has no `--delete`
Files removed from the repo **stay live on the server**. Delete them manually:
```bash
ssh -i ~/.ssh/KEY -p 65002 USER@HOST 'rm -f path/to/file'
```

### NEVER `rsync --delete` from the hub — subdomains are subfolders of its docroot
On this Hostinger account the subdomains live **inside** the hub's docroot:
`oze.au/public_html/calendar`, `/music`, `/domains`, … So the hub (`oze.au`)
deploys `./ → /…/oze.au/public_html/`, whose children include other repos'
sites. Adding `--delete` to the **hub** deploy wipes every sibling subdomain
folder not in the hub repo. This actually happened: it deleted `calendar/` (404)
and emptied `music/` (403); fix was to remove `--delete` and re-run each
subdomain's deploy to repopulate. Rule:
- **Hub (`oze.au`) deploy: no `--delete`, ever.** Its docroot is shared.
- It's the rsync **target path** that matters, not whether the site lives under
  the hub docroot. A subdomain repo whose deploy targets *its own leaf folder*
  (`…/public_html/<name>/`) **may** use `--delete` safely — it only reconciles
  that folder, never siblings. Confirmed live on `wallplanner` (deploys to
  `…/public_html/wallplanner/` with `--delete`; siblings stayed 200). Same for
  `celebrate` with its `shirley90/` subfolder.
- Purge stale hub files by hand (see above), not with `--delete`.

### Deploy SSH times out intermittently (exit 255)
Hostinger fail2ban / runner IP causes random `Connection timed out` at rsync.
The workflow has a 3-attempt retry with backoff + SSH keepalive, but it can
still fail — just re-run:
```bash
gh run rerun --repo OWNER/REPO $(gh run list --repo OWNER/REPO -L1 --json databaseId --jq '.[0].databaseId')
```

### Verify deploys against the live URL, not the CI green tick
A green deploy that rsynced stale bytes still looks green. After deploy, curl the
live asset and confirm the version/content actually changed.

### Stale `actions/checkout` token wedged in `.git/config` (auth failures)
A local repo that was once checked out by CI can carry a dead
`http.https://github.com/.extraheader = AUTHORIZATION: basic <ghs_…>` in
`.git/config`. It overrides every credential helper, so `git push` fails with
"Invalid username or token" even though `gh` itself is authenticated. Fix:
```bash
git config --unset-all http.https://github.com/.extraheader
```

### Never keep a private key in the repo working dir
`music` had `key.txt` (an OpenSSH private key) sitting in the repo root. Its
`deploy.sh` runs `git add .`, so one deploy would have committed the key. Keep
keys in `~/.ssh`; if one must sit nearby, `.gitignore` it (`key.txt`, `*.pem`,
`id_*`, `*_rsa`, `*_ed25519`) and confirm `git check-ignore` catches it. Then
verify it's not web-served (`curl -o /dev/null -w '%{http_code}' .../key.txt`
should be 404).

## 4. `bump-version.sh` (carry to every repo)

One command updates, in lockstep:
- `?v=` cache-busters and the `VERSION` constant in `js/script.js`,
- every `Version:` header comment (matches any X.Y.Z, so stale headers self-heal),
- every `Date:` header → today, **date + time AEST** (`dd Mon yyyy | h:mm AM/PM AEST`),
- the footer build stamp (`vX.Y.Z · dd Mon yyyy`).

The version stays pure semver; the date is a separate auto-set build date. Because
the script rewrites *all* files, every header/footer matches the site version and
nothing drifts.

```bash
./bump-version.sh 1.0.1   # then commit + push
```

Copy this file into each subdomain repo — it assumes the house header/footer
conventions (§2). For the `Date:`/footer rewrites to land, each file must already
carry a `Date:` header line and the footer the `vX.Y.Z · dd Mon yyyy` stamp.

## 5. Per-subdomain animation

Each subdomain gets a **small, distinct** canvas animation so the family feels
related but not identical. `domains` uses the globe + particle network
(`js/globe.js`). Build new ones as variations on the same engine:

| Subdomain | Animation idea |
|---|---|
| oze.au (hub) | drone 3D parallax tilt + floating motes canvas (done) |
| domains | rotating wireframe globe + particle network (done) |
| celebrate | drifting confetti — `js/confetti.js`, z-index:2 (done) |
| music | falling musical notes (♪♫♩♬) — `js/notes.js`, z-index:2 (done) |
| hosting/web | particle mesh only (no globe), server-rack pulse |
| email | orbiting nodes, envelope motes along arcs |
| status | pulse-wave grid / heartbeat line |

Rules for every animation:
- Self-contained canvas injected behind the page, `pointer-events:none`.
- `z-index:2` if it should float **above** glass cards (home/hero pages),
  `z-index:0` to sit **below** content.
- **Always** skip on `prefers-reduced-motion`, reduce work on mobile, and pause
  the render loop on `visibilitychange` (hidden tab).
- Brand palette: amber `#ffc107`, blue `#3498db`, white — semi-transparent so the
  background photo reads through.
- **Per-page opt-out, no JSON coupling:** keep the animation self-contained (it
  reads no config). For a calmer page, opt out with a `<body>` data attribute the
  script checks on init — e.g. celebrate's `confetti.js` bails on
  `<body data-confetti="off">`. Don't make the animation `fetch()` `event.json`;
  that couples it to async config load and breaks the drop-in pattern.

**Two gotchas found wiring celebrate's confetti:**
- **celebrate had no `?v=` cache-busters at all** — assets were linked bare
  (`css/celebrate.css`). Without the `?v=`, the §3 cache-buster rule can't work.
  Add `?v=` on every `<link>`/`<script>` when levelling up an old subdomain.
- **celebrate versions are `vX.Y` (two-part) with two date header styles** — ISO
  `YYYY-MM-DD AEST` one-liners *and* `D Month YYYY` blocks. The ported
  `bump-version.sh` handles both formats and self-heals stale per-file headers;
  port the script per subdomain rather than assuming the `X.Y.Z` layout.

**TODO:** refactor `globe.js` into a shared `anim.js` that takes a `variant`
parameter, so subdomains select a style instead of forking the file.

## 6. Patterns to adopt from celebrate.oze.au

celebrate is the most advanced sibling — harvest these:
- **Config-driven content via a single JSON file** (`event.json`). New instances
  are made by duplicating a folder and editing JSON only — no HTML edits. Great
  for any subdomain that spins up repeatable instances.
- **Folder-per-instance routing** (`celebrate.oze.au/[name]/`).
- **Rich media building blocks**: countdown timer, Google Photos gallery,
  YouTube embed, audio player, JSON-driven message wall, Google-Forms RSVP.
  Lift these as drop-in components when a subdomain needs them.

## 7. New-subdomain checklist

1. `git init` repo `coldix/<sub>-oze-au`; copy `css/`, `js/`, `.htaccess`,
   `bump-version.sh`, `.github/workflows/deploy.yml`, `robots.txt` skeleton.
2. Set the rsync target subfolder + `HOSTINGER_SSH_KEY_B64` secret in the repo.
3. Build pages with the standard header, glass cards, theme toggle, footer
   (legal modals + build stamp).
4. Add the subdomain's animation variant (§5).
5. SEO/AI baseline (§2): robots, sitemap, llms.txt, canonical, schema, og/twitter.
6. `./bump-version.sh 1.0.0`, commit, push to `main`.
7. **Register on the hub** (§0): add the subdomain's `.link-card`, JSON-LD nav
   entry, `sitemap.xml` and `llms.txt` line on `oze.au`.
8. **Verify live** (§3): curl the asset `?v=`, click through pages, test theme +
   modals + animation, check mobile.
9. Update this playbook if you learn something new.