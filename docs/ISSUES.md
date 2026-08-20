# Victoria 2026 issues survey

**Live:** https://survey.oze.net.au/s/vic-issues

Open oze survey of the 15 issue rows on the [Election Tracker policy matrix](https://electiontracker.au/elections/vic/2026/parties/matrix). Not a scientific poll, not a scorecard, and not a voting recommendation. The tracker does not say which party has the best policy.

## Flow

About 3 minutes.

1. Where you live (Victoria / rest of Australia / overseas), postcode if in Australia, age, enrolled.
2. Rate all 15 issues 1–5. Untouched rows have no value.
3. If more than three issues tie at the top, pick which of those tied issues are your top 3.
4. For each of those 3: whose sourced headline is closest in your view (Greens / Labor / Liberal–Nationals / One Nation / Not sure / No one).
5. Reveal: your ranking, then crowd (once n is large enough).

## Results

Two views, counted separately for thresholds:

| View | Who |
|---|---|
| Everywhere | Every accepted response, including Victoria and overseas |
| Victoria | `stateFromPostcode` is `VIC` (3000–3999 and 8000–8999) |

Crowd ranking shows at **n ≥ 30** in that view. Party splits show at **n ≥ 15** people in that view who put the issue in their **top 3** — never “rated 4–5”.

No tracker-average seed. First respondents get their own card and a recruitment prompt, not a hollow you-vs-crowd.

## Integrity

- One response per browser (`client_hash`) per calendar month. Same-wifi friends are not blocked.
- IP is used for the 8/hour rate limit and logs only.
- Same month window as the voting poll (18 Aug–28 Nov 2026, Melbourne).

## Snapshot

Issue names and headlines are committed in `src/data/vic-issues.ts`. Refresh from the elections checkout:

```bash
ELECTIONS_ROOT=/path/to/elections npm run sync:issues
npm run check:issues
```

Do not fetch electiontracker.au at build time.

## Share

```
What should decide Victoria 2026?

Rank the 15 issues from the policy matrix, then pick whose sourced policy is closest — in your view. About 3 minutes. Open to anyone, including overseas.

https://survey.oze.net.au/s/vic-issues

Sourced party positions: https://electiontracker.au/elections/vic/2026/parties/matrix
```
