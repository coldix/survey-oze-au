# Spec: Vic 2026 issues survey — v2

Supersedes the v1 plan. Changes are driven by three decisions: the reveal now
includes a **party-breakdown pie**, the policy comparison is **blind**, and
**federal-only issues are dropped**.

Read this whole document before writing code. Sections 2, 5 and 6 contain rules
that cannot be traded away for convenience.

---

## 1. What changed from v1

| v1 | v2 | Why |
|---|---|---|
| Party picks on your personal top 3 | Blind picks on a **fixed set of 10**, same for everyone | A 3-slice pie is meaningless; a fixed set gives uniform denominators and valid crowd stats |
| Cards labelled with party names | **Party names hidden until after the choice** | Labelled cards measure party loyalty, not policy agreement |
| 15 issues rated, incl. Immigration | **14 rated** (federal-only dropped), **10 compared** | Vic election; Spring Street has no immigration lever |
| Reveal = your ranking vs crowd | Reveal = **your picks + pie + crowd**, with a weighting toggle | The blind reveal is the shareable moment |
| "Top 3, ties broken by shuffle" | Ties resolved by an explicit tap step | 1–5 across 15 issues produces 6–8 way ties routinely |

---

## 2. Issue selection — rules, not opinions

Two **factual** gates decide which issues get a blind comparison. Neither
requires an editorial judgment about who is right.

**Gate 1 — jurisdiction.** Include `state` and `state/local`. Include `shared`
where the Victorian government is a substantive spender or regulator (health,
education, energy, cost of living, transport all qualify). Exclude `federal`.
This drops **Immigration** and nothing else from the current 15.

**Gate 2 — completeness.** All four display columns (Greens, Labor, Coalition
combined, One Nation) must have a stated position in the matrix for that issue.
A blind four-card choice where one card reads "no stated position" is broken —
it leaks the attribution and produces junk data.

If more than 10 issues pass both gates, add **Gate 3 — differentiation**, and
declare it: a `differentiated: true` flag in the tracker YAML, set where the
four stated positions are materially different rather than near-identical
motherhood statements. This *is* an editorial call, so it must be:
- documented in `docs/policy-methodology.md` as a **selection** judgment, never
  a **ranking** judgment,
- listed publicly on the survey's FAQ ("we compare the 10 issues where the
  parties have said clearly different things"),
- reviewable — record which issues were excluded and why.

Rate all 14 that pass Gate 1. Compare only the 10 that pass all gates. **The
rating list and the comparison list are deliberately different lengths.**

Confirm the final 10 against `data/vic2026/issues.yaml` before building. Do not
hardcode the list in the React app — derive it from the synced issue data so it
stays true when the matrix changes.

---

## 3. Flow

1. **You** — postcode, age group, enrolled. Honeypot + 4s minimum dwell (reuse
   `poll-security.ts`).
2. **Rate 14 issues**, 1–5 segmented buttons, order shuffled per session.
   Untouched rows are not counted as 3 — they block Continue.
   *Keep the existing screen, apply the fixes in §9.*
3. **Resolve ties** — only shown when more than 3 issues share the top rating:
   > You rated 7 issues as a deciding issue. Which **3** decide your vote most?
   Shows only the tied set. Records an explicit ordering.
4. **Blind comparison × 10** — one issue per screen, §4.
5. **Reveal** — §5. Gated until submit succeeds.

Honest length: **4–6 minutes**. Say that on the landing page. Do not advertise
90 seconds; step 4 is deliberately reading-heavy and that is the whole point of
the product.

---

## 4. The blind comparison round

One screen per issue, 10 screens. Progress indicator ("4 of 10").

```
Housing & Planning                                    [State / local]

Which of these comes closest to your view?
We've hidden who said what. You'll find out at the end.

  ┌────────────────────────────────────────────┐
  │ A.  <blind claim>                          │
  ├────────────────────────────────────────────┤
  │ B.  <blind claim>                          │
  ├────────────────────────────────────────────┤
  │ C.  <blind claim>                          │
  ├────────────────────────────────────────────┤
  │ D.  <blind claim>                          │
  └────────────────────────────────────────────┘

  ○ None of these come close
  ○ I can't choose between them
```

Rules:

- **Order randomised per respondent per issue.** Record the order shown.
- **`none` and `cant_choose` are different answers.** "I reject all four" and
  "several are equally good" are opposite findings. Never collapse them.
- **No attribution anywhere on this screen** — not in the text, not in a colour,
  not in an icon. Party colours (`PARTY_COLORS`) must not appear until reveal.
- No "Read the comparison" link here either; it would reveal the parties. Move
  the matrix links to the reveal screen.

### Blind claims are new content

Matrix `policy.headline` values name the party ("Labor will build…"). They
cannot be used blind. This needs a new field authored in the tracker YAML:

```yaml
policy:
  headline: "Labor will build 800,000 homes over a decade"
  blind_claim: "Build 800,000 new homes over a decade, mostly through
                planning-rule changes and public land release"
```

Authoring rules for `blind_claim`:

- **A few words only** — take the main position from the matrix headline
  (`policy.blind_claim`). Do not write 15–25 word paragraphs; a long card
  next to a short one is a tell, and phones cannot hold that much text.
  Aim for one short clause (about 4–8 words), same register for all four.
- Same register — no slogans in one and dry policy in another.
- Strip party names, leader names, and signature program names.
- Keep the substance including the *cost or scale* claim, since that is often
  the real difference. Do not sand off "with lower spending" — that is the
  distinguishing content.
- Some claims remain recognisable to an engaged reader. That is acceptable and
  expected; do not distort the policy to disguise it.

60 statements (10 issues × 4 (need not be 4 for issues where fewer qualify,
but Gate 2 means all 10 have 4). Author them in the `elections` repo where the
sourcing lives, never in the survey app.

**If the 60 statements aren't ready:** ship v1 labelled, but set `blind = 0` in
the data so the two waves stay comparable. Do not silently mix.

---

## 5. The reveal

Order matters — the surprise comes first, the context second.

**5.1 The reveal moment.** Animate the attribution onto the 10 choices they
just made. This is the payoff; give it a beat.

**5.2 Headline line.** A count, never a percentage-match:

> You picked the **Greens'** policy most often — **4 of your 10 choices**.

Ties: name both. Zero dominant party: "Your picks were spread across four
parties — no clear favourite."

**5.3 The pie.**

- Slices: `alp`, `lnp`, `grn`, `onp`, plus a grey **No pick** slice covering
  `none` + `cant_choose`. Never hide the grey slice — it is real data.
- Use `PARTY_COLORS` from `poll-math.ts`.
- Label: **"Your 10 picks"**. See §6 for the wording rules.

**5.4 Weighting toggle.** Directly under the pie:

```
[ ] Weight by how much each issue matters to me
```

Off by default. When on, each pick contributes its rating rather than 1:

```
share(party) = Σ rating(i) for issues i where pick(i) = party
               ─────────────────────────────────────────────
               Σ rating(i) over all 10 compared issues
```

`none`/`cant_choose` keep their weight and stay in the grey slice, so shares
always total 100%. Animate the transition — the pie visibly moving is the
interesting part. Add one line of explanation:

> Weighted by your own ratings. Same picks, counted by what you said matters.

Store both computed shares; they are cheap and you will want them for analysis.

**5.5 Your issue ranking** — bars 1–5, your top 3 marked.

**5.6 Crowd.** Subject to the minimum-n gate in §8:
- Crowd mean rating per issue, with n.
- The issue the crowd rates high that you rated low.
- Per issue, the crowd's blind pick split — **"among everyone who answered",**
  since all respondents answer all 10. Uniform denominator, state it plainly.

**5.7 Actions.** Share card · Open the policy matrix (now with party names) ·
Take the monthly voting survey.

---

## 6. What the pie is, and what it must never become

`docs/policy-methodology.md` forbids the tracker computing or displaying an
editorial winner. The pie does not breach that, **for one specific reason**:
every input is the respondent's own tap, and the site adds no judgment of its
own. Keep it that way.

**Allowed**

- "Your 10 picks", "You picked the Greens' policy 4 times"
- Counting choices; weighting those choices by the user's own ratings
- Reporting crowd aggregates of the same counts
- Telling the user which party made a statement they chose (a sourced fact)

**Forbidden — do not build any of these**

- "You are 62% Greens", "73% match", any percent framed as *alignment*
  (percent framed as *share of your picks* is fine, but prefer the raw count)
- Any left–right axis, spectrum position, or compass plot
- Scoring the policies themselves, star ratings, "best policy on X"
- Any recommendation, or any sentence containing "you should vote"
- Extrapolating from 10 picks to "your party"

**Mandatory disclaimer**, on the reveal and on the share card:

> This counts your own choices. It is not a voting recommendation, and not a
> measure of which party is best.

**FAQ line about the blind method** (needed — this is the honest limitation):

> Blind comparison shows what people find persuasive when a policy is stripped
> of its party label. It measures the appeal of a stated claim — not whether
> the claim is achievable, costed, or likely to be delivered. For sourced
> detail on every position, see the policy matrix.

---

## 7. Data model

`migrations/0005_issue_responses.sql`

```sql
CREATE TABLE issue_responses (
  id            TEXT PRIMARY KEY,
  poll_month    TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  client_hash   TEXT    NOT NULL,
  postcode      TEXT,
  state         TEXT,
  age           TEXT,
  enrolled      TEXT,
  ratings_json  TEXT    NOT NULL,   -- {issue_slug: 1..5} for all 14
  top3_json     TEXT    NOT NULL,   -- ordered slugs after tie resolution
  issue_set     TEXT    NOT NULL,   -- the 10 slugs compared, in fixed order
  matrix_hash   TEXT    NOT NULL,   -- hash of every blind_claim shown
  blind         INTEGER NOT NULL,   -- 1 = names hidden at choice time
  ip            TEXT,
  ip_hash       TEXT    NOT NULL,
  user_agent    TEXT,
  country       TEXT,
  asn           INTEGER,
  bot_score     INTEGER,
  source        TEXT    NOT NULL DEFAULT 'live'
);
CREATE UNIQUE INDEX idx_issue_month_client ON issue_responses (poll_month, client_hash);

CREATE TABLE issue_picks (
  response_id  TEXT    NOT NULL REFERENCES issue_responses(id),
  issue_slug   TEXT    NOT NULL,
  chosen       TEXT    NOT NULL,   -- alp|lnp|grn|onp|none|cant_choose
  chosen_slot  INTEGER,            -- 0..3 position tapped, NULL for none/cant_choose
  shown_order  TEXT    NOT NULL,   -- e.g. 'grn,onp,alp,lnp'
  ms_to_pick   INTEGER,
  rating       INTEGER NOT NULL,   -- denormalised, for weighted aggregation
  PRIMARY KEY (response_id, issue_slug)
);
CREATE INDEX idx_picks_issue ON issue_picks (issue_slug, chosen);
```

Four columns earn their place and are easy to omit by mistake:

- **`matrix_hash`** — the matrix will be edited between August and November.
  Without a hash of exactly what was shown, an October wording change makes 
  every earlier response uninterpretable. This is not optional.
- **`shown_order` + `chosen_slot`** — lets you measure and correct position
  bias, and lets you *prove* the first card wasn't just winning. Impossible to
  reconstruct later.
- **`ms_to_pick`** — separates readers from tappers. Your quality filter, and
  your answer when someone says "nobody read it".
- **`rating` on the pick row** — denormalised deliberately so weighted crowd
  aggregates are one query, not a join plus JSON parse.

**Dedupe on `client_hash` only.** Do not copy the monthly poll's
`client_hash OR ip_hash` rule. This survey grows by sharing to friends and
family, who are frequently behind one home wifi, office NAT, or mobile CGNAT.
IP dedupe would give them a silent fake success. Keep `ip_hash` for the
8-per-hour rate limit only.

---

## 8. API and performance

`POST /api/issues/submit` — validate: month window open, all 14 ratings present
and 1–5, exactly 3 in top3, exactly 10 picks with slugs matching `issue_set`,
postcode resolves via `stateFromPostcode()`.

`GET /api/issues/results?month=YYYY-MM` — returns issue means + n, blind pick
splits per issue (raw and weighted), pie aggregates, and the month list.

Two things the existing code will get wrong if copied blindly:

1. **The shared `json()` helper sets `Cache-Control: no-store`.** Results are
   monthly aggregates. Give the results endpoint its own response with
   `public, max-age=60, stale-while-revalidate=300`, or every viral visitor
   hits D1 directly.
2. **Aggregate with SQL, not JSON parsing.** `issue_picks` is a proper table —
   use `GROUP BY issue_slug, chosen`. Do not copy the `/api/stats/:slug`
   pattern of selecting every row and parsing blobs in JS.

Keep all aggregation maths in a pure `src/lib/issues-math.ts` with no `Request`
or D1 in scope, mirroring `poll-math.ts` / `poll-results.ts`. This repo has no
test framework — purity is the only lever you have.

**Vic filter:** use `stateFromPostcode(pc) === 'VIC'`. Never a `3xxx` string
prefix — Victorian postcodes are 3000–3999 **and** 8000–8999.

---

## 9. Fixes to the existing rating screen

From the current build:

1. **Drop the per-row scale labels.** The legend is already at the top;
   repeating "Doesn't affect my vote" 15 times is most of the page. Rows show
   `1 2 3 4 5` only.
2. **Typographic bug:** `1Doesn't affect my vote` / `5A deciding issue` — no
   space between number and label.
3. **Test on a phone before anything else.** Five labelled buttons across a
   375px screen is ~70px each. The current screenshot is desktop and is hiding
   this.
4. **Sticky footer** with "n of 14 rated" and Continue.
5. **Selected state** needs a non-colour cue (weight or a check) and a contrast
   check, not just a light fill.
6. Keep: shuffled order, jurisdiction chips, untouched-≠-3.

---

## 10. Cold start

The reveal leans on crowd comparison, and you have correctly refused to seed.
So design the empty state rather than letting it happen:

- Below **n = 30** overall: hide crowd panels entirely. Show the pie, the picks,
  the ranking, plus "You're one of the first N people. Come back in a few days
  to see how Victoria compares" and a share prompt framed as recruitment.
- Below **n = 15 for a given issue**: hide that issue's pick split, keep the
  rest.
- Never show a percentage computed from fewer than 15 responses anywhere.

The first hundred respondents are the ones whose sharing decides whether this
spreads at all. Their experience must be good *without* a crowd.

---

## 11. Share card

```
MY VICTORIA 2026 — blind policy test

I compared 10 policies without knowing who wrote them.

  Greens      ████████░░  4
  Labor       ██████░░░░  3
  Coalition   ████░░░░░░  2
  No pick     ██░░░░░░░░  1

Counts my own picks. Not a voting recommendation.

Try it: survey.oze.net.au/s/vic-issues
Policies: electiontracker.au
```

Use `navigator.share()` with the generated file where available, falling back
to the existing copy-to-clipboard text pattern. Programmatic canvas downloads
are unreliable on iOS Safari — treat the PNG as the enhancement, not the path.

---

## 12. URL

Use **`/s/vic-issues`**, not `/s/issues`. A federal issues survey is explicitly
out of scope *for now*, which is exactly why the general namespace should stay
free.

---

## 13. Verify

- Phone (375px) and 1440px: full flow, submit, reveal, pie animates on toggle,
  share works.
- No party name, colour, or icon is reachable in the DOM during the blind round.
  Check the network payload too — do not ship attributions to the client early.
- Card order differs between two fresh sessions; `shown_order` matches what
  rendered.
- `none` and `cant_choose` land as distinct values.
- Weighted and unweighted shares each total 100% including the grey slice.
- Second submit in the same month → duplicate, no double count.
- Two people on the same wifi can both submit.
- `matrix_hash` changes when a `blind_claim` is edited.
- Cold-start: with n < 30, no crowd panel and no percentage anywhere.
- Every compared issue passes both gates; Immigration is absent.
- `npm run check` in survey; `npm run check` in elections.

---

## 14. Ship order

1. `blind_claim` authoring in `elections` + the gate flags. **Blocks everything
   else** — build against real statements, not lorem ipsum.
2. Sync script, migration, submit/results API.
3. Rating-screen fixes (§9) + tie-resolution step.
4. Blind round.
5. Reveal: picks → pie → weighting toggle → crowd, with cold-start states.
6. Share card.
7. Tracker CTAs + methodology paragraph.
8. Deploy survey, then elections.

---

## 15. Decisions still needed from Colin

1. **The final 10.** Needs a pass over `issues.yaml` against Gates 1–3.
   14 pass Gate 1; someone has to look at the matrix to see how many pass 2 and
   whether Gate 3 is needed at all.
2. **Who authors the 60 `blind_claim` statements**, and who checks them for
   even-handedness. This is the critical path and it is editorial work, not
   code.
3. **Monthly repeat?** Voting intention moves month to month; issue salience
   moves slowly, and nobody wants to redo a blind test they have already seen
   the answer to. Consider one response per person for the whole series, with
   the reveal being replayable.
