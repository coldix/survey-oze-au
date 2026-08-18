# Monthly voting poll

**Live:** https://survey.oze.net.au/s/monthly-poll

One survey, two contests, each calendar month from **18 Aug 2026** through **28 Nov 2026** (Victorian election day).

- Victorian state election, 28 Nov 2026
- Next federal election (2028). We do not ask House vs Senate — one federal answer.

Not a scientific poll and not a forecast. Sourced pollster averages: [electiontracker.au](https://electiontracker.au/).

## Window

Melbourne time. Open all month (August started 18 Aug). November closes on the 28th. One response per person per month (browser id + IP hash).

## Pies

Same three views as Election Tracker (primary vote only, not 2PP):

1. Five-way — Labor / Coalition / One Nation / Greens / Others
2. Left / Right + Others
3. Left / Right with Others split in proportion

Vic pies: enrolled + Victorian postcode (`3xxx`).  
Federal pies: all enrolled.  
By-state federal table: live answers only.

## August start count

August charts begin with **1,000** votes set to the Election Tracker average (no bands):

Labor 27.7% · Coalition 21.4% · One Nation 26.8% · Greens 13.1% · Others 11.0%

Same split on Vic and federal (those two tracker pages matched when this was set). Live answers add on top. Coded in `src/lib/poll-seed.ts` — not stored as fake respondents.

Sources: [Vic polls](https://electiontracker.au/elections/vic/2026/polls), [federal polls](https://electiontracker.au/elections/federal/49/polls).

## Bot checks

Honeypot, minimum 4s on page, 8 attempts/hour per IP, one vote per client id and per IP per month. D1 stores IP, hashed IP, user-agent, country, ASN, Cloudflare bot score when present. Those fields are not in the public API.

## Share

```
How would you vote — Victoria 28 Nov 2026, and the next federal election?

Take the monthly oze poll (about a minute, one vote per month):
https://survey.oze.net.au/s/monthly-poll

Latest sourced polling and candidates: https://electiontracker.au/
```
