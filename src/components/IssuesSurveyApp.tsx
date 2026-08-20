import { useEffect, useMemo, useState } from 'react';
import type { PollWindow } from '../lib/poll-window';
import { shuffle } from '../lib/shuffle';
import { crowdBlindSpot, type IssuesMonthResults, type IssuesView } from '../lib/issues-results';
import {
  AGES,
  CROWD_RANK_MIN,
  DISPLAY_PARTIES,
  ENROLLED,
  ISSUES_SOCIAL_COPY,
  ISSUES_URL,
  ISSUE_SLUGS,
  LOCATIONS,
  MATRIX_URL,
  MONTHLY_POLL_URL,
  PICK_OPTIONS,
  PICK_SPLIT_MIN,
  RATING_LABELS,
  RATING_VALUES,
  VIC_ISSUES,
  issueBySlug,
  ratingsComplete,
  rankedSlugs,
  top3Plan,
  type IssuesAnswers,
  type LocationKind,
  type PickId,
  type Rating,
} from '../lib/issues-survey';

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
  return `oze-vic-issues-${month}-done`;
}
function answersKey(month: string) {
  return `oze-vic-issues-${month}-answers`;
}

function emptyRatings(): Record<string, Rating | null> {
  return Object.fromEntries(ISSUE_SLUGS.map((slug) => [slug, null]));
}

export default function IssuesSurveyApp({ window: initialWindow }: { window: PollWindow }) {
  const [pollWindow, setPollWindow] = useState(initialWindow);
  const month = pollWindow.resultsMonth;
  const canSubmit = pollWindow.open && month === pollWindow.month;
  const order = useMemo(() => shuffle(VIC_ISSUES), []);

  const [step, setStep] = useState<Step>('you');
  const [location, setLocation] = useState<LocationKind | ''>('');
  const [postcode, setPostcode] = useState('');
  const [age, setAge] = useState('');
  const [enrolled, setEnrolled] = useState('');
  const [website, setWebsite] = useState('');
  const [openedAt] = useState(() => Date.now());
  const [ratings, setRatings] = useState<Record<string, Rating | null>>(emptyRatings);
  const [tieChoice, setTieChoice] = useState<string[]>([]);
  const [top3, setTop3] = useState<string[]>([]);
  const [picks, setPicks] = useState<Record<string, PickId>>({});
  const [pickIndex, setPickIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [mine, setMine] = useState<IssuesAnswers | null>(null);
  const [results, setResults] = useState<IssuesMonthResults | null>(null);
  const [crowdView, setCrowdView] = useState<CrowdKey>('everywhere');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');

  useEffect(() => {
    const saved = localStorage.getItem(answersKey(pollWindow.month));
    if (localStorage.getItem(doneKey(pollWindow.month)) === '1' && saved) {
      try {
        const parsed = JSON.parse(saved) as IssuesAnswers;
        setMine(parsed);
        setTop3(parsed.top3);
        setDone(true);
        setStep('reveal');
      } catch {
        /* ignore */
      }
    }
  }, [pollWindow.month]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/issues/results?month=${encodeURIComponent(month)}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<IssuesMonthResults & { window?: PollWindow }>)
      .then((payload) => {
        if (cancelled) return;
        setResults(payload);
        if (payload.window) setPollWindow(payload.window);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [month]);

  const youReady =
    Boolean(location) &&
    Boolean(age) &&
    Boolean(enrolled) &&
    (location === 'overseas' || /^\d{4}$/.test(postcode));
  const rateReady = ratingsComplete(ratings);
  const plan = rateReady ? top3Plan(ratings) : null;

  function goRate() {
    setError(null);
    setStep('rate');
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
    setPicks({});
    setPickIndex(0);
    setStep('picks');
  }

  function confirmTie() {
    if (!plan?.needChoice) return;
    if (tieChoice.length !== plan.remaining) {
      setError(`Pick ${plan.remaining} of these.`);
      return;
    }
    setError(null);
    setTop3([...plan.definite, ...tieChoice]);
    setPicks({});
    setPickIndex(0);
    setStep('picks');
  }

  function toggleTie(slug: string) {
    if (!plan) return;
    setTieChoice((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= plan.remaining) return current;
      return [...current, slug];
    });
  }

  async function submit(nextTop3: string[], nextPicks: Record<string, PickId>) {
    if (!location || !ratingsComplete(ratings)) return;
    setBusy(true);
    setError(null);
    const answers: IssuesAnswers = { location, ratings, top3: nextTop3, picks: nextPicks };
    try {
      const response = await fetch('/api/issues/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...answers,
          postcode: location === 'overseas' ? '' : postcode,
          age,
          enrolled,
          clientId: clientId(pollWindow.month),
          openedAt,
          website,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; duplicate?: boolean };
      if (payload.duplicate) {
        setAlready(true);
        setDone(true);
        setMine(answers);
        localStorage.setItem(doneKey(pollWindow.month), '1');
        localStorage.setItem(answersKey(pollWindow.month), JSON.stringify(answers));
        setStep('reveal');
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not save your response.');
      localStorage.setItem(doneKey(pollWindow.month), '1');
      localStorage.setItem(answersKey(pollWindow.month), JSON.stringify(answers));
      setMine(answers);
      setDone(true);
      setStep('reveal');
      const refresh = await fetch(`/api/issues/results?month=${encodeURIComponent(pollWindow.month)}`, { cache: "no-store" });
      setResults((await refresh.json()) as IssuesMonthResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your response.');
    } finally {
      setBusy(false);
    }
  }

  function choosePick(pick: PickId) {
    const slug = top3[pickIndex];
    if (!slug) return;
    const nextPicks = { ...picks, [slug]: pick };
    setPicks(nextPicks);
    if (pickIndex < top3.length - 1) {
      setPickIndex(pickIndex + 1);
      return;
    }
    void submit(top3, nextPicks);
  }

  const pickIssue = issueBySlug(top3[pickIndex] ?? '');

  return (
    <div className="issues-page">
      <section className="hero">
        <p className="phase-tag">Victoria 2026 · issues</p>
        <h1>What should decide this election?</h1>
        <p className="lede">
          Rank the 15 issues from the Election Tracker policy matrix, then pick whose sourced
          policy is closest — in your view. About 3 minutes. Open to anyone, including overseas.
          Not a scientific poll, not a scorecard, and not a voting recommendation.
        </p>
        <p className="lede">
          Sourced positions:{' '}
          <a href={MATRIX_URL} rel="noopener">
            electiontracker.au policy matrix
          </a>
          .
        </p>
        <p className="lede">
          <strong>{pollWindow.label}</strong>
        </p>
      </section>

      {canSubmit && !done && step === 'you' && (
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
            <button className="btn btn-primary" type="button" disabled={!youReady} onClick={goRate}>
              Rate the issues
            </button>
          </div>
        </section>
      )}

      {canSubmit && !done && step === 'rate' && (
        <section className="glass">
          <h2>How much does each issue matter to your vote?</h2>
          <p className="lede">
            1 {RATING_LABELS[1]} · 3 {RATING_LABELS[3]} · 5 {RATING_LABELS[5]}. Every issue needs a tap — untouched
            rows are not counted as 3.
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
                      <span>
                        {value}
                        <abbr>{value === 1 || value === 3 || value === 5 ? RATING_LABELS[value] : ''}</abbr>
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p className="lede">{ISSUE_SLUGS.filter((slug) => ratings[slug] != null).length} of 15 rated</p>
          <div className="nav-row">
            <button className="btn btn-ghost" type="button" onClick={() => setStep('you')}>
              Back
            </button>
            <button className="btn btn-primary" type="button" disabled={!rateReady} onClick={goFromRatings}>
              Continue
            </button>
          </div>
        </section>
      )}

      {canSubmit && !done && step === 'tie' && plan?.needChoice && (
        <section className="glass">
          <h2>Which {plan.remaining === 1 ? 'issue' : `${plan.remaining} issues`} matter most?</h2>
          <p className="lede">
            Several issues share the same score. Pick {plan.remaining} for the next step — we will not choose for you.
          </p>
          <ul className="tie-list">
            {plan.tied.map((slug) => {
              const issue = issueBySlug(slug);
              if (!issue) return null;
              const on = tieChoice.includes(slug);
              return (
                <li key={slug}>
                  <button type="button" className={on ? 'option on-btn' : 'option'} aria-pressed={on} onClick={() => toggleTie(slug)}>
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

      {canSubmit && !done && step === 'picks' && pickIssue && (
        <section className="glass">
          <p className="phase-tag">
            Your top 3 · {pickIndex + 1} of {top3.length}
          </p>
          <h2>{pickIssue.name}</h2>
          <p className="lede">{pickIssue.summary}</p>
          <p className="lede">
            Whose policy is closest to yours? Headlines are from the sourced matrix — this is your view, not a site ranking.{' '}
            <a href={pickIssue.comparisonUrl} rel="noopener">
              Read the comparison
            </a>
          </p>
          <div className="headline-grid">
            {DISPLAY_PARTIES.map((party) => {
              const headline = pickIssue.headlines[party.id];
              return (
                <button
                  key={party.id}
                  type="button"
                  className="headline-card"
                  disabled={busy}
                  onClick={() => choosePick(party.id)}
                >
                  <strong>{party.label}</strong>
                  <span>{headline ?? 'No sourced position recorded yet.'}</span>
                </button>
              );
            })}
          </div>
          <div className="pick-extra">
            {PICK_OPTIONS.filter((option) => option.id === 'unsure' || option.id === 'none').map((option) => (
              <button key={option.id} className="btn btn-ghost" type="button" disabled={busy} onClick={() => choosePick(option.id)}>
                {option.label}
              </button>
            ))}
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
                else setPickIndex(pickIndex - 1);
              }}
            >
              Back
            </button>
            <span />
          </div>
        </section>
      )}

      {(done || !canSubmit) && (
        <Reveal
          mine={mine}
          already={already}
          results={results}
          crowdView={crowdView}
          onView={setCrowdView}
          shareState={shareState}
          onShare={setShareState}
          canSubmit={canSubmit}
        />
      )}

      {!canSubmit && !results && (
        <section className="glass">
          <p className="lede">{pollWindow.label}</p>
        </section>
      )}
    </div>
  );
}

function Reveal({
  mine,
  already,
  results,
  crowdView,
  onView,
  shareState,
  onShare,
  canSubmit,
}: {
  mine: IssuesAnswers | null;
  already: boolean;
  results: IssuesMonthResults | null;
  crowdView: CrowdKey;
  onView: (view: CrowdKey) => void;
  shareState: 'idle' | 'copied' | 'shared';
  onShare: (state: 'idle' | 'copied' | 'shared') => void;
  canSubmit: boolean;
}) {
  const view: IssuesView | undefined = results?.[crowdView];
  const names = (mine?.top3 ?? []).map((slug) => issueBySlug(slug)?.name ?? slug);
  const blind = mine && view ? crowdBlindSpot(view, mine.top3) : null;
  const shareText = shareCopy(names);

  return (
    <>
      <section className="glass">
        {already && <p className="notice">Already counted this month. Your card is below — friends on the same network can still take it.</p>}
        {mine ? (
          <>
            <h2>Your Victoria 2026 issues</h2>
            <p className="lede">Not a voting recommendation. One open survey response for this month.</p>
            <ol className="my-rank">
              {rankedSlugs(mine.ratings).map((slug, index) => {
                const issue = issueBySlug(slug);
                const score = mine.ratings[slug] ?? 0;
                const picked = mine.top3.includes(slug);
                return (
                  <li key={slug} className={picked ? 'top' : undefined}>
                    <span className="rank-n">{index + 1}</span>
                    <span>
                      <strong>{issue?.name ?? slug}</strong>
                      {picked && mine.picks[slug] ? (
                        <em> · closest in your view: {PICK_OPTIONS.find((option) => option.id === mine.picks[slug])?.label}</em>
                      ) : null}
                    </span>
                    <span className="rank-score" aria-label={`${score} out of 5`}>
                      {RATING_VALUES.map((value) => (
                        <span key={value} className={value <= score ? "on" : undefined} />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <>
            <h2>Crowd results</h2>
            <p className="lede">Take the survey this month to unlock your own ranked card.</p>
          </>
        )}

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
            You’re among the first {Math.max(view.n, mine ? 1 : 0)} in this view. The crowd ranking appears at {CROWD_RANK_MIN} responses.
            Send this so it fills in.
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
          </>
        )}

        {mine &&
          view &&
          mine.top3.map((slug) => {
            const issue = issueBySlug(slug);
            const crowdIssue = view.issues.find((item) => item.slug === slug);
            if (!issue || !crowdIssue) return null;
            return (
              <div key={slug} className="pick-split">
                <h3>{issue.name}</h3>
                <p className="lede">
                  You picked {PICK_OPTIONS.find((option) => option.id === mine.picks[slug])?.label ?? '—'}.
                  {crowdIssue.showPicks
                    ? ` Among people who put this in their top 3 (n=${crowdIssue.top3n}):`
                    : ` Party splits appear after ${PICK_SPLIT_MIN} people in this view put it in their top 3 (now ${crowdIssue.top3n}).`}
                </p>
                {crowdIssue.showPicks && (
                  <ul className="split-bars">
                    {PICK_OPTIONS.map((option) => {
                      const count = crowdIssue.pickCounts[option.id] ?? 0;
                      const pct = crowdIssue.top3n ? Math.round((100 * count) / crowdIssue.top3n) : 0;
                      if (!count && (option.id === 'unsure' || option.id === 'none')) return null;
                      return (
                        <li key={option.id}>
                          <span>{option.label}</span>
                          <span className="tally-bar" aria-hidden="true">
                            <span style={{ width: `${pct}%` }} />
                          </span>
                          <span className="mono">{pct}%</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

        <div className="share-box">
          <p className="phase-tag">Share</p>
          <pre className="share-copy">{shareText}</pre>
          <div className="btn-row-inline">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                void shareResult(shareText, names).then(onShare);
              }}
            >
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
      {canSubmit ? null : <p className="lede">This month’s survey is closed. Results above are the latest snapshot.</p>}
    </>
  );
}

function shareCopy(names: string[]): string {
  const list = names.length
    ? names.map((name, index) => `${index + 1}. ${name}`).join('\n')
    : ISSUES_SOCIAL_COPY;
  if (!names.length) return ISSUES_SOCIAL_COPY;
  return `My Victoria 2026 issues:
${list}

Whose policy is closest — my pick. Not a voting recommendation.

What’s yours?
${ISSUES_URL}

Sourced policies: ${MATRIX_URL}`;
}

async function shareResult(text: string, names: string[]): Promise<'copied' | 'shared'> {
  const shareData: ShareData = { title: 'My Victoria 2026 issues', text, url: ISSUES_URL };
  try {
    if (typeof navigator.share === 'function') {
      const file = names.length ? await pngCard(names) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
        return 'shared';
      }
      await navigator.share(shareData);
      return 'shared';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'copied';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

async function pngCard(names: string[]): Promise<File | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#08121a';
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#18b6e6';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText('MY VICTORIA 2026', 72, 140);
    ctx.fillStyle = '#eaf3f1';
    ctx.font = '700 52px Georgia, serif';
    names.slice(0, 3).forEach((name, index) => {
      ctx.fillText(`${index + 1}. ${name}`, 72, 280 + index * 88);
    });
    ctx.font = '500 28px system-ui, sans-serif';
    ctx.fillStyle = '#9fb4b0';
    ctx.fillText('Not a voting recommendation.', 72, 620);
    ctx.fillText('survey.oze.net.au/s/vic-issues', 72, 920);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new File([blob], 'vic-issues.png', { type: 'image/png' });
  } catch {
    return null;
  }
}
