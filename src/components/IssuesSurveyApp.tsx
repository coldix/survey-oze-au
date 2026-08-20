import { useEffect, useMemo, useState } from 'react';
import type { PollWindow } from '../lib/poll-window';
import { shuffle } from '../lib/shuffle';
import { crowdBlindSpot, type IssuesMonthResults } from '../lib/issues-results';
import type { RevealPayload } from '../lib/issues-math';
import type { BlindPickInput, LocationKind, Rating, RoundIssue } from '../lib/issues-survey';
import IssuesPicksPie from './IssuesPicksPie';
import {
  AGES,
  CROWD_RANK_MIN,
  ENROLLED,
  ISSUES_URL,
  COMPARE_SLUGS,
  LOCATIONS,
  MATRIX_URL,
  MONTHLY_POLL_URL,
  RATE_ISSUES,
  RATE_SLUGS,
  RATING_LABELS,
  RATING_VALUES,
  issueBySlug,
  ratingsComplete,
  rankedSlugs,
  top3Plan,
} from '../lib/issues-survey';
import { PIE_LABELS, type PieShares } from '../lib/issues-math';

type Step = 'you' | 'rate' | 'tie' | 'picks' | 'reveal';
type CrowdKey = 'everywhere' | 'victoria';

function clientId(month: string): string {
  const key = `oze-vic-issues-${month}-client`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
function doneKey(month: string) {
  return `oze-vic-issues-v2-${month}-done`;
}
function revealKey(month: string) {
  return `oze-vic-issues-v2-${month}-reveal`;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function IssuesSurveyApp({ window: initialWindow }: { window: PollWindow }) {
  const [pollWindow] = useState(initialWindow);
  const month = pollWindow.resultsMonth;
  const canSubmit = pollWindow.open && month === pollWindow.month;
  const order = useMemo(() => shuffle(RATE_ISSUES), []);
  const cid = useMemo(() => (typeof window === 'undefined' ? '' : clientId(pollWindow.month)), [pollWindow.month]);

  const [step, setStep] = useState<Step>('you');
  const [location, setLocation] = useState<LocationKind | ''>('');
  const [postcode, setPostcode] = useState('');
  const [age, setAge] = useState('');
  const [enrolled, setEnrolled] = useState('');
  const [website, setWebsite] = useState('');
  const [openedAt] = useState(() => Date.now());
  const [ratings, setRatings] = useState<Record<string, Rating | null>>(() =>
    Object.fromEntries(RATE_SLUGS.map((slug) => [slug, null])),
  );
  const [tieChoice, setTieChoice] = useState<string[]>([]);
  const [top3, setTop3] = useState<string[]>([]);
  const [round, setRound] = useState<RoundIssue[] | null>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [picks, setPicks] = useState<BlindPickInput[]>([]);
  const [screenAt, setScreenAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [already, setAlready] = useState(false);
  const [results, setResults] = useState<IssuesMonthResults | null>(null);
  const [crowdView, setCrowdView] = useState<CrowdKey>('everywhere');
  const [weighted, setWeighted] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [named, setNamed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(revealKey(pollWindow.month));
    if (localStorage.getItem(doneKey(pollWindow.month)) === '1' && saved) {
      try {
        const parsed = JSON.parse(saved) as RevealPayload;
        setReveal(parsed);
        setStep('reveal');
        setNamed(true);
      } catch {
        /* ignore */
      }
    }
  }, [pollWindow.month]);

  useEffect(() => {
    if (step !== 'reveal') return;
    const t = window.setTimeout(() => setNamed(true), 400);
    return () => window.clearTimeout(t);
  }, [step]);

  const youReady =
    Boolean(location) && Boolean(age) && Boolean(enrolled) && (location === 'overseas' || /^\d{4}$/.test(postcode));
  const rateReady = ratingsComplete(ratings);
  const plan = rateReady ? top3Plan(ratings) : null;
  const ratedCount = RATE_SLUGS.filter((slug) => ratings[slug] != null).length;
  const current = round?.[pickIndex];

  async function loadRound() {
    const response = await fetch(`/api/issues/round?clientId=${encodeURIComponent(cid)}`);
    const payload = (await response.json()) as { ok?: boolean; issues?: RoundIssue[]; error?: string };
    if (!response.ok || !payload.ok || !payload.issues) throw new Error(payload.error || 'Could not load the comparison.');
    setRound(payload.issues);
    setPickIndex(0);
    setPicks([]);
    setScreenAt(Date.now());
    setStep('picks');
  }

  function goFromRatings() {
    if (!rateReady || !plan) return;
    setError(null);
    if (plan.needChoice) {
      setTieChoice([]);
      setStep('tie');
      return;
    }
    setTop3(plan.definite);
    void loadRound().catch((err) => setError(err instanceof Error ? err.message : 'Could not load the comparison.'));
  }

  function confirmTie() {
    if (!plan?.needChoice) return;
    if (tieChoice.length !== plan.remaining) {
      setError(`Pick ${plan.remaining} of these.`);
      return;
    }
    setError(null);
    setTop3([...plan.definite, ...tieChoice]);
    void loadRound().catch((err) => setError(err instanceof Error ? err.message : 'Could not load the comparison.'));
  }

  function choose(slot: BlindPickInput['slot']) {
    if (!current) return;
    const next = [...picks.filter((row) => row.slug !== current.slug), { slug: current.slug, slot, ms: Date.now() - screenAt }];
    setPicks(next);
    if (pickIndex < (round?.length ?? 0) - 1) {
      setPickIndex(pickIndex + 1);
      setScreenAt(Date.now());
      return;
    }
    void submit(next);
  }

  async function submit(nextPicks: BlindPickInput[]) {
    if (!location || !ratingsComplete(ratings)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/issues/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          postcode: location === 'overseas' ? '' : postcode,
          age,
          enrolled,
          ratings,
          top3,
          picks: nextPicks,
          clientId: cid,
          openedAt,
          website,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; duplicate?: boolean; reveal?: RevealPayload };
      if (payload.reveal) {
        localStorage.setItem(doneKey(pollWindow.month), '1');
        localStorage.setItem(revealKey(pollWindow.month), JSON.stringify(payload.reveal));
        setReveal(payload.reveal);
        setAlready(Boolean(payload.duplicate));
        setNamed(false);
        setStep('reveal');
        const crowd = await fetch(`/api/issues/results?month=${encodeURIComponent(pollWindow.month)}`, { cache: 'no-store' });
        setResults((await crowd.json()) as IssuesMonthResults);
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not save your response.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your response.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="issues-page">
      <section className="hero">
        <p className="phase-tag">Victoria 2026 · issues</p>
        <h1>What should decide this election?</h1>
        <p className="lede">
          Rate 14 issues, then compare 10 policies <strong>without seeing who wrote them</strong>. About 4–6 minutes.
          Open to anyone, including overseas. Not a scientific poll, not a scorecard, and not a voting recommendation.
        </p>
        <p className="lede">
          Sourced from the{' '}
          <a href={MATRIX_URL} rel="noopener">
            Election Tracker policy matrix
          </a>
          . We compare the 10 issues where the four parties have said clearly different things.
        </p>
        <p className="lede">
          <strong>{pollWindow.label}</strong>
        </p>
      </section>

      {canSubmit && step === 'you' && !reveal && (
        <section className="glass">
          <h2>You</h2>
          <fieldset className="options">
            <legend>Where do you live?</legend>
            {LOCATIONS.map((option) => (
              <label className="option" key={option.id}>
                <input type="radio" name="location" checked={location === option.id} onChange={() => setLocation(option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          {location && location !== 'overseas' && (
            <label className="field">
              Australian postcode
              <input className="text-input" inputMode="numeric" maxLength={4} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
            </label>
          )}
          <label className="hp" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <fieldset className="options">
            <legend>Age group</legend>
            {AGES.map((option) => (
              <label className="option" key={option}>
                <input type="radio" name="age" checked={age === option} onChange={() => setAge(option)} />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>Are you enrolled to vote in Australia?</legend>
            {ENROLLED.map((option) => (
              <label className="option" key={option.id}>
                <input type="radio" name="enrolled" checked={enrolled === option.id} onChange={() => setEnrolled(option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="nav-row">
            <span />
            <button className="btn btn-primary" type="button" disabled={!youReady} onClick={() => setStep('rate')}>
              Rate the issues
            </button>
          </div>
        </section>
      )}

      {canSubmit && step === 'rate' && !reveal && (
        <section className="glass">
          <h2>How much does each issue matter to your vote?</h2>
          <p className="lede">
            1 {RATING_LABELS[1]} · 3 {RATING_LABELS[3]} · 5 {RATING_LABELS[5]}. Every row needs a tap.
          </p>
          <ol className="issue-list">
            {order.map((issue) => (
              <li key={issue.slug} className="issue-rate">
                <div className="issue-head">
                  <h3 id={`issue-${issue.slug}`}>
                    {issue.name} <span className="badge">{issue.chip}</span>
                  </h3>
                  <p>{issue.summary}</p>
                </div>
                <div className="scale-row" role="radiogroup" aria-labelledby={`issue-${issue.slug}`}>
                  {RATING_VALUES.map((value) => (
                    <label key={value} className={ratings[issue.slug] === value ? 'on' : undefined}>
                      <input
                        type="radio"
                        name={`rating-${issue.slug}`}
                        value={value}
                        checked={ratings[issue.slug] === value}
                        onChange={() => setRatings((current) => ({ ...current, [issue.slug]: value }))}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="rate-foot">
            <p className="lede">{ratedCount} of 14 rated</p>
            <div className="nav-row">
              <button className="btn btn-ghost" type="button" onClick={() => setStep('you')}>
                Back
              </button>
              <button className="btn btn-primary" type="button" disabled={!rateReady} onClick={goFromRatings}>
                Continue
              </button>
            </div>
          </div>
          {error && <p className="lede">{error}</p>}
        </section>
      )}

      {canSubmit && step === 'tie' && plan?.needChoice && !reveal && (
        <section className="glass">
          <h2>
            You rated {plan.tied.length} issues as a deciding issue. Which {plan.remaining === 1 ? 'one' : plan.remaining}{' '}
            decide your vote most?
          </h2>
          <p className="lede">Pick {plan.remaining} from this set — we will not choose for you.</p>
          <ul className="tie-list">
            {plan.tied.map((slug) => {
              const issue = issueBySlug(slug);
              if (!issue) return null;
              const on = tieChoice.includes(slug);
              return (
                <li key={slug}>
                  <button type="button" className="option" aria-pressed={on} onClick={() => {
                    setTieChoice((current) => {
                      if (current.includes(slug)) return current.filter((item) => item !== slug);
                      if (current.length >= plan.remaining) return current;
                      return [...current, slug];
                    });
                  }}>
                    {issue.name}
                  </button>
                </li>
              );
            })}
          </ul>
          {error && <p className="lede">{error}</p>}
          <div className="nav-row">
            <button className="btn btn-ghost" type="button" onClick={() => setStep('rate')}>
              Back
            </button>
            <button className="btn btn-primary" type="button" disabled={tieChoice.length !== plan.remaining} onClick={confirmTie}>
              Continue
            </button>
          </div>
        </section>
      )}

      {canSubmit && step === 'picks' && current && (
        <section className="glass">
          <p className="phase-tag">
            {pickIndex + 1} of {round?.length ?? 10}
          </p>
          <h2>
            {current.name} <span className="badge">{current.chip}</span>
          </h2>
          <p className="lede">{current.summary}</p>
          <p className="lede">Which of these comes closest to your view? We’ve hidden who said what. You’ll find out at the end.</p>
          <div className="headline-grid blind-grid">
            {current.options.map((text, index) => (
              <button key={`${current.slug}-${index}`} type="button" className="headline-card" disabled={busy} onClick={() => choose(index)}>
                <strong>{LETTERS[index]}.</strong>
                <span>{text}</span>
              </button>
            ))}
          </div>
          <div className="pick-extra">
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => choose('none')}>
              None of these come close
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => choose('cant_choose')}>
              I can’t choose between them
            </button>
          </div>
          {error && <p className="lede">{error}</p>}
          {busy && <p className="lede">Saving…</p>}
          <div className="nav-row">
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                if (pickIndex === 0) setStep(plan?.needChoice ? 'tie' : 'rate');
                else {
                  setPickIndex(pickIndex - 1);
                  setScreenAt(Date.now());
                }
              }}
            >
              Back
            </button>
            <span />
          </div>
        </section>
      )}

      {step === 'reveal' && reveal && (
        <Reveal
          reveal={reveal}
          named={named}
          already={already}
          results={results}
          crowdView={crowdView}
          onView={setCrowdView}
          weighted={weighted}
          onWeighted={setWeighted}
          shareState={shareState}
          onShare={setShareState}
        />
      )}

      {!canSubmit && !reveal && (
        <section className="glass">
          <p className="lede">{pollWindow.label}</p>
        </section>
      )}
    </div>
  );
}

function Reveal({
  reveal,
  named,
  already,
  results,
  crowdView,
  onView,
  weighted,
  onWeighted,
  shareState,
  onShare,
}: {
  reveal: RevealPayload;
  named: boolean;
  already: boolean;
  results: IssuesMonthResults | null;
  crowdView: CrowdKey;
  onView: (view: CrowdKey) => void;
  weighted: boolean;
  onWeighted: (value: boolean) => void;
  shareState: 'idle' | 'copied' | 'shared';
  onShare: (state: 'idle' | 'copied' | 'shared') => void;
}) {
  const shares: PieShares = weighted ? reveal.weighted : reveal.unweighted;
  const view = results?.[crowdView];
  const blind = crowdBlindSpot(view ?? { n: 0, showRank: false, issues: [] }, reveal.top3);
  const shareText = shareCopy(reveal);

  return (
    <section className="glass">
      {already && <p className="notice">Already counted this month. Your results are below — friends on the same network can still take it.</p>}
      <p className="phase-tag">Your 10 picks</p>
      <h2 className={named ? 'reveal-in' : undefined}>{named ? reveal.headline : 'Matching who said what…'}</h2>
      <ul className="reveal-picks">
        {reveal.picks.map((pick) => (
          <li key={pick.slug}>
            <strong>{pick.name}</strong>
            <span>{pick.claim}</span>
            <em className={named ? 'reveal-in' : 'reveal-wait'}>{named ? pick.partyLabel ?? (pick.chosen === 'none' ? 'None of these' : 'Couldn’t choose') : '…'}</em>
          </li>
        ))}
      </ul>
      <p className="lede notice">
        This counts your own choices. It is not a voting recommendation, and not a measure of which party is best.
      </p>
      <h3>Your 10 picks</h3>
      <IssuesPicksPie shares={shares} title="Your 10 picks" />
      <label className="weight-toggle">
        <input type="checkbox" checked={weighted} onChange={(e) => onWeighted(e.target.checked)} />
        Weight by how much each issue matters to me
      </label>
      {weighted && <p className="lede">Weighted by your own ratings. Same picks, counted by what you said matters.</p>}

      <h3>Your issue ranking</h3>
      <ol className="my-rank">
        {rankedSlugs(reveal.ratings as Record<string, Rating>).map((slug, index) => {
          const issue = issueBySlug(slug);
          const score = reveal.ratings[slug] ?? 0;
          const picked = reveal.top3.includes(slug);
          return (
            <li key={slug} className={picked ? 'top' : undefined}>
              <span className="rank-n">{index + 1}</span>
              <span>
                <strong>{issue?.name ?? slug}</strong>
                {COMPARE_SLUGS.includes(slug) ? <em> · compared</em> : null}
              </span>
              <span className="rank-score" aria-label={`${score} out of 5`}>
                {RATING_VALUES.map((value) => (
                  <span key={value} className={value <= score ? 'on' : undefined} />
                ))}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="view-toggle" role="tablist" aria-label="Result view">
        <button type="button" className={crowdView === 'everywhere' ? 'chart-tab on' : 'chart-tab'} onClick={() => onView('everywhere')}>
          Everywhere{results ? ` · ${results.everywhere.n}` : ''}
        </button>
        <button type="button" className={crowdView === 'victoria' ? 'chart-tab on' : 'chart-tab'} onClick={() => onView('victoria')}>
          Victoria{results ? ` · ${results.victoria.n}` : ''}
        </button>
      </div>

      {view && !view.showRank && (
        <p className="notice">
          You’re one of the first {Math.max(view.n, 1)} people in this view. Come back in a few days to see how Victoria
          compares — send this so the crowd fills in. Crowd ranking appears at {CROWD_RANK_MIN} responses.
        </p>
      )}

      {view?.showRank && (
        <>
          <h3>Crowd ranking · {crowdView === 'victoria' ? 'Victoria' : 'Everywhere'}</h3>
          <ol className="crowd-rank">
            {[...view.issues]
              .filter((item) => item.rank != null)
              .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
              .map((item) => (
                <li key={item.slug}>
                  <span>{item.rank}</span>
                  <span>{issueBySlug(item.slug)?.name ?? item.slug}</span>
                  <span className="mono">{item.mean?.toFixed(2)}</span>
                </li>
              ))}
          </ol>
          {blind && (
            <p className="lede">
              The crowd puts <strong>{issueBySlug(blind)?.name}</strong> higher than you did in your top 3.
            </p>
          )}
          {COMPARE_SLUGS.map((slug) => {
            const issue = issueBySlug(slug);
            const crowdIssue = view.issues.find((item) => item.slug === slug);
            if (!issue || !crowdIssue?.showPicks) return null;
            return (
              <div key={slug} className="pick-split">
                <h3>{issue.name}</h3>
                <p className="lede">Among everyone who answered (n={crowdIssue.nPicks}):</p>
                <ul className="split-bars">
                  {(['grn', 'alp', 'lnp', 'onp', 'none', 'cant_choose'] as const).map((key) => {
                    const count = crowdIssue.pickCounts[key] ?? 0;
                    const pct = crowdIssue.nPicks ? Math.round((100 * count) / crowdIssue.nPicks) : 0;
                    const label = key === 'none' ? 'None of these' : key === 'cant_choose' ? 'Can’t choose' : PIE_LABELS[key];
                    return (
                      <li key={key}>
                        <span>{label}</span>
                        <span className="tally-bar" aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                        <span className="mono">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}

      <div className="share-box">
        <p className="phase-tag">Share</p>
        <pre className="share-copy">{shareText}</pre>
        <div className="btn-row-inline">
          <button className="btn btn-primary" type="button" onClick={() => void shareResult(shareText).then(onShare)}>
            {shareState === 'copied' ? 'Copied' : shareState === 'shared' ? 'Shared' : 'Share my issues'}
          </button>
          <a className="btn btn-ghost" href={MONTHLY_POLL_URL}>
            Take the monthly vote survey
          </a>
          <a className="btn btn-ghost" href={MATRIX_URL} rel="noopener">
            Open the policy matrix
          </a>
        </div>
      </div>
    </section>
  );
}

function shareCopy(reveal: RevealPayload): string {
  const counts = reveal.unweighted;
  const bar = (n: number) => '█'.repeat(Math.round(n * 10)) + '░'.repeat(10 - Math.round(n * 10));
  return `MY VICTORIA 2026 — blind policy test

I compared 10 policies without knowing who wrote them.

  Greens      ${bar(counts.grn)}  ${Math.round(counts.grn * 10)}
  Labor       ${bar(counts.alp)}  ${Math.round(counts.alp * 10)}
  Coalition   ${bar(counts.lnp)}  ${Math.round(counts.lnp * 10)}
  One Nation  ${bar(counts.onp)}  ${Math.round(counts.onp * 10)}
  No pick     ${bar(counts.nopick)}  ${Math.round(counts.nopick * 10)}

Counts my own picks. Not a voting recommendation.

Try it: ${ISSUES_URL}
Policies: electiontracker.au`;
}

async function shareResult(text: string): Promise<'copied' | 'shared'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'My Victoria 2026 issues', text, url: ISSUES_URL });
      return 'shared';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'copied';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
