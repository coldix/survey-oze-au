import { useEffect, useMemo, useState } from 'react';
import { INTENTION_OPTIONS, LAST_VOTE_OPTIONS } from '../lib/poll-math';
import type { PollMonthResults } from '../lib/poll-results';
import type { PollWindow } from '../lib/poll-window';
import PollPies from './PollPies';

const AGES = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const ENROLLED = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unsure', label: 'Not sure' },
];

type FormState = {
  postcode: string;
  age: string;
  gender: string;
  enrolled: string;
  vic_last: string;
  federal_last: string;
  vic_now: string;
  federal_now: string;
};

const empty: FormState = {
  postcode: '',
  age: '',
  gender: '',
  enrolled: '',
  vic_last: '',
  federal_last: '',
  vic_now: '',
  federal_now: '',
};

function clientId(month: string): string {
  const key = `oze-monthly-poll-${month}-client`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function doneKey(month: string) {
  return `oze-monthly-poll-${month}-done`;
}

export default function MonthlyPollApp({ window: initialWindow }: { window: PollWindow }) {
  const [pollWindow, setPollWindow] = useState(initialWindow);
  const monthParam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('month');
  }, []);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : pollWindow.resultsMonth;
  const canSubmit = pollWindow.open && month === pollWindow.month;

  const [form, setForm] = useState<FormState>(empty);
  const [website, setWebsite] = useState('');
  const [openedAt] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<PollMonthResults | null>(null);
  const [months, setMonths] = useState<string[]>([]);

  useEffect(() => {
    setDone(localStorage.getItem(doneKey(pollWindow.month)) === '1');
  }, [pollWindow.month]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/poll/results?month=${encodeURIComponent(month)}`)
      .then((response) => response.json() as Promise<PollMonthResults & { months?: string[]; window?: PollWindow }>)
      .then((payload) => {
        if (cancelled) return;
        setResults(payload);
        if (payload.months) setMonths(payload.months);
        if (payload.window) setPollWindow(payload.window);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [month]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const ready = Object.values(form).every(Boolean) && /^\d{4}$/.test(form.postcode);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/poll/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clientId: clientId(pollWindow.month),
          openedAt,
          website,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; duplicate?: boolean };
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not save your response.');
      localStorage.setItem(doneKey(pollWindow.month), '1');
      setDone(true);
      const refresh = await fetch(`/api/poll/results?month=${encodeURIComponent(pollWindow.month)}`);
      setResults((await refresh.json()) as PollMonthResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your response.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="poll-page">
      <section className="hero">
        <p className="phase-tag">Monthly oze poll</p>
        <h1>How would you vote?</h1>
        <p className="lede">
          Victorian state election (28 Nov 2026) and the next federal election (2028) — one survey, both contests.
          We assume your federal vote is the same in both houses. Open each month through election day.
          One response per person per month. This is an oze survey — not a scientific poll and not a forecast.
        </p>
        <p className="lede">
          For sourced pollster numbers and candidates see{' '}
          <a href="https://electiontracker.au/" rel="noopener">electiontracker.au</a>.
        </p>
        <p className="lede"><strong>{pollWindow.label}</strong></p>
        <ShareBlock copied={copied} onCopied={() => setCopied(true)} />
      </section>

      {canSubmit && !done && (
        <section className="glass">
          <h2>This month’s questions</h2>
          <label className="field">
            Australian postcode
            <input className="text-input" inputMode="numeric" maxLength={4} value={form.postcode} onChange={(e) => set('postcode', e.target.value)} />
          </label>
          <label className="hp" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <fieldset className="options">
            <legend>Age group</legend>
            {AGES.map((option) => (
              <label className="option" key={option}>
                <input type="radio" name="age" checked={form.age === option} onChange={() => set('age', option)} />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>Gender</legend>
            {GENDERS.map((option) => (
              <label className="option" key={option}>
                <input type="radio" name="gender" checked={form.gender === option} onChange={() => set('gender', option)} />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>Are you enrolled to vote in Australia?</legend>
            {ENROLLED.map((option) => (
              <label className="option" key={option.id}>
                <input type="radio" name="enrolled" checked={form.enrolled === option.id} onChange={() => set('enrolled', option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>How did you vote at the last Victorian state election?</legend>
            {LAST_VOTE_OPTIONS.map((option) => (
              <label className="option" key={`vl-${option.id}`}>
                <input type="radio" name="vic_last" checked={form.vic_last === option.id} onChange={() => set('vic_last', option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>How did you vote at the last federal election?</legend>
            {LAST_VOTE_OPTIONS.filter((option) => option.id !== 'not_vic').map((option) => (
              <label className="option" key={`fl-${option.id}`}>
                <input type="radio" name="federal_last" checked={form.federal_last === option.id} onChange={() => set('federal_last', option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>If the Victorian election (28 Nov 2026) were held today, who would you vote for?</legend>
            {INTENTION_OPTIONS.map((option) => (
              <label className="option" key={`vn-${option.id}`}>
                <input type="radio" name="vic_now" checked={form.vic_now === option.id} onChange={() => set('vic_now', option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="options">
            <legend>If the next federal election were held today, who would you vote for?</legend>
            {INTENTION_OPTIONS.map((option) => (
              <label className="option" key={`fn-${option.id}`}>
                <input type="radio" name="federal_now" checked={form.federal_now === option.id} onChange={() => set('federal_now', option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          {error && <p className="muted">{error}</p>}
          <div className="nav-row">
            <span />
            <button className="btn btn-primary" type="button" disabled={!ready || busy} onClick={() => void submit()}>
              {busy ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </section>
      )}

      {done && canSubmit && <p className="lede">Thanks — your response for {pollWindow.month} is in. Results below update as others answer.</p>}

      {results && (
        <>
          {month === '2026-08' && (results.seedCount ?? 0) > 0 && (
            <p className="lede notice">
              August starts with a single count of <strong>1,000</strong> votes set to the
              Election Tracker average (Labor 27.7%, Coalition 21.4%, One Nation 26.8%, Greens 13.1%,
              Others 11.0%). Same split for Vic and federal.{' '}
              <a href="https://electiontracker.au/elections/vic/2026/polls" rel="noopener">Vic source</a>
              {' · '}
              <a href="https://electiontracker.au/elections/federal/49/polls" rel="noopener">Federal source</a>.
              {' '}Live answers ({results.liveCount ?? 0}) are added on top. August only. Not a forecast.
            </p>
          )}
          <PollPies title={`Victoria 2026 · ${month}`} contest={results.vic} prefix={`vic-${month}`} />
          <PollPies title={`Federal 2028 · ${month}`} contest={results.federal} prefix={`fed-${month}`} />
          {results.federalByState.length > 0 && (
            <section className="glass">
              <h2>Federal result by state</h2>
              <p className="lede">From postcode. Enrolled respondents only. Small n is noisy.</p>
              <div className="state-table">
                <div className="state-head"><span>State</span><span>n</span><span>ALP</span><span>L-NP</span><span>ONP</span><span>GRN</span><span>OTH</span></div>
                {results.federalByState.map((row) => (
                  <div className="state-row" key={row.state}>
                    <span>{row.state}</span>
                    <span>{row.n}</span>
                    <span>{row.primaries.alp.toFixed(0)}</span>
                    <span>{row.primaries.lnp.toFixed(0)}</span>
                    <span>{row.primaries.onp.toFixed(0)}</span>
                    <span>{row.primaries.grn.toFixed(0)}</span>
                    <span>{row.primaries.others.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {months.length > 0 && (
        <p className="lede">
          Archive:{' '}
          {months.map((item, index) => (
            <span key={item}>
              {index > 0 ? ' · ' : null}
              <a href={`/s/monthly-poll?month=${item}`}>{item}</a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function ShareBlock({ copied, onCopied }: { copied: boolean; onCopied: () => void }) {
  const text = `How would you vote — Victoria 28 Nov 2026, and the next federal election?

Take the monthly oze poll (about a minute, one vote per month):
https://survey.oze.net.au/s/monthly-poll

Latest sourced polling and candidates: https://electiontracker.au/`;
  return (
    <div className="share-box">
      <p className="phase-tag">Share this poll</p>
      <p className="lede">
        Link: <a href="https://survey.oze.net.au/s/monthly-poll">https://survey.oze.net.au/s/monthly-poll</a>
      </p>
      <pre className="share-copy">{text}</pre>
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(onCopied);
        }}
      >
        {copied ? 'Copied' : 'Copy text for socials'}
      </button>
    </div>
  );
}
