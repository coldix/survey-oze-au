# Victoria 2026 issues survey

**Live:** https://survey.oze.net.au/s/vic-issues

Open oze survey. Rate **14** Vic issues, then compare **10** sourced statements **without party names**. Not a scientific poll, not a scorecard, not a voting recommendation.

Spec: [ISSUESSURVEYSPEC.md](ISSUESSURVEYSPEC.md).

## Selection

- **Rated (14):** every matrix issue except Immigration (federal-only).
- **Compared (10):** `differentiated: true` in `elections` `issues.yaml` — Cost of living, Energy, Education, Crime, Gender & social, Climate, Treaty, Housing, Health, Transport.
- **Rated only:** Firearms, Corruption, Debt & budget, Environment & forestry.

## Flow

About 4–6 minutes.

1. Location, postcode if in Australia, age, enrolled.
2. Rate 14 issues 1–5. Untouched ≠ 3. Sticky “n of 14”.
3. If more than three share the cutoff score, pick which of those are your top 3.
4. Blind round × 10. Party names hidden. `none` and `can’t choose` are different.
5. Reveal: who said what, pie of your 10 picks, optional rating-weight, crowd when n ≥ 30.

## Results

| View | Who |
|---|---|
| Everywhere | Every response, including Victoria and overseas |
| Victoria | `stateFromPostcode(pc) === 'VIC'` |

Crowd ranking at **n ≥ 30**. Per-issue pick splits at **n ≥ 15**, among **everyone who answered** that comparison (uniform 10).

## Integrity

- One response per browser per calendar month (`client_hash` only).
- IP for 8/hour rate limit only.
- `matrix_hash` + `shown_order` stored so later headline edits do not silently mix waves.
- Claims are **not** in the client bundle; the round API returns shuffled texts only.

## Snapshot

```bash
ELECTIONS_ROOT=/path/to/elections npm run sync:issues
npm run check:issues
```
