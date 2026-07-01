# survey.oze.au

Beautiful, embeddable survey platform for [oze.au](https://oze.au) — OzeGlass V2.0 Aurora styling, vanilla HTML/CSS/JS, no build step.

**Live:** [survey.oze.au/money](https://survey.oze.au/money) — *Money in Your Wallet* (Australian Currency Knowledge Survey)

| | |
|---|---|
| **Repo** | [github.com/coldix/survey-oze-au](https://github.com/coldix/survey-oze-au) |
| **Stack** | Single-file HTML surveys, embedded CSS + JS |
| **Design** | OzeGlass V2.0 Aurora (see [oze.au playbook](https://oze.au/docs/PLAYBOOK.md)) |
| **Author** | Colin Dixon · [oze.au](https://oze.au) |

## What's here

| Path | Purpose |
|------|---------|
| `money/index.html` | Currency knowledge survey (MVP, v1.0.3) |
| `money/images/` | oze.au logo and survey assets |
| `docs/survey-project-plan.md` | Full project plan and roadmap |
| `docs/layout-lessons.md` | **Layout dos/don'ts** — read before building survey #2 |
| `docs/playbook.md` | oze.au house conventions (reference copy) |

## Features (Money survey)

- Demographics (age + gender) at start
- Phase 1: denominations, material, colour matching, decimal currency
- Phase 2: historical figures drag-and-drop
- Phase 3: $5 note redesign and opinion questions
- Drag-and-drop matching (colours → notes, people → notes) with mobile tap fallback
- Progress bar, dark/light theme, anonymous one-entry via `localStorage`
- Results: personal score, explanations, community stats (simulated baseline)
- Subscribe + star rating with email capture (`mailto:`)

## Local preview

```bash
cd money
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `money/index.html` directly in a browser.

## Deploy

Follows the oze.au subdomain playbook. Target Hostinger path (hub docroot):

```
oze.au/public_html/survey/
```

GitHub Actions workflow template: [`docs/deploy-workflow.yml`](docs/deploy-workflow.yml). Copy to `.github/workflows/deploy.yml` and add the `HOSTINGER_SSH_KEY_B64` repo secret (needs a PAT with `workflow` scope to push workflow files).

Manual deploy (after SSH key is in `~/.ssh/gha_hostinger`):

```bash
./deploy.sh
```

## Versioning

Semver in the HTML file header and footer. Bump with:

```bash
./bump-version.sh 1.0.3
```

## New surveys

1. Duplicate `money/index.html` to a new folder (e.g. `history/index.html`)
2. Edit `SURVEY_DATA` and branding in the embedded script
3. Bump version, commit, push
4. Add a link on `index.html` when the survey hub landing page exists

## License

© Colin Dixon. All rights reserved.