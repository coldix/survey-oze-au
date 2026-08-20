import { useEffect, useState } from 'react';

type SurveyCard = {
  slug: string;
  title: string;
  open_start: string | null;
  open_end: string | null;
  archived: number;
  total: number;
  flagged: number;
  window: { open: boolean; month: string; label: string };
};

type Row = {
  id: string;
  survey: string;
  created_at: number;
  poll_month?: string;
  ip?: string | null;
  country?: string | null;
  asn?: number | null;
  bot_score?: number | null;
  user_agent?: string | null;
  flagged?: number;
  flag_reason?: string | null;
  reasons?: string[];
  postcode?: string;
  state?: string;
  location?: string;
  age?: string;
  vic_now?: string;
  federal_now?: string;
  score?: number;
  max?: number;
};

function when(ts: number) {
  return new Date(ts).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const payload = (await response.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (response.status === 401) throw Object.assign(new Error('auth'), { auth: true });
  if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Request failed');
  return payload;
}

export default function AdminApp() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'boot' | 'login' | 'code' | 'app'>('boot');
  const [me, setMe] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SurveyCard[]>([]);
  const [survey, setSurvey] = useState('monthly-poll');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  async function boot() {
    try {
      const mePayload = (await api('/api/admin/me')) as { email: string };
      setMe(mePayload.email);
      setStage('app');
      await loadOverview();
    } catch (err) {
      if ((err as { auth?: boolean }).auth) setStage('login');
      else setStage('login');
    }
  }

  async function loadOverview() {
    const payload = (await api('/api/admin/overview')) as { surveys: SurveyCard[] };
    setSurveys(payload.surveys);
    const current = payload.surveys.find((item) => item.slug === survey) ?? payload.surveys[0];
    if (current) {
      setStart(current.open_start ?? '');
      setEnd(current.open_end ?? '');
    }
  }

  async function loadRows(nextSurvey = survey, flagged = flaggedOnly) {
    const payload = (await api(`/api/admin/responses?survey=${nextSurvey}&flagged=${flagged ? '1' : '0'}&limit=120`)) as { rows: Row[] };
    setRows(payload.rows);
  }

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    if (stage !== 'app') return;
    void loadRows();
  }, [stage, survey, flaggedOnly]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const payload = (await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email }) })) as { debugCode?: string };
      setDebugCode(payload.debugCode ?? null);
      setStage('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const payload = (await api('/api/admin/verify', { method: 'POST', body: JSON.stringify({ email, code }) })) as { email: string };
      setMe(payload.email);
      setStage('app');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify.');
    } finally {
      setBusy(false);
    }
  }

  const selected = surveys.find((item) => item.slug === survey);

  return (
    <div className="admin-page">
      <section className="hero">
        <p className="phase-tag">Admin</p>
        <h1>Survey dashboard</h1>
        <p className="lede">Responses, suspicion flags, date windows, archive and restart. Sign-in is email-only.</p>
      </section>

      {stage !== 'app' && (
        <section className="glass">
          <h2>{stage === 'code' ? 'Enter the code' : 'Sign in'}</h2>
          {stage !== 'code' ? (
            <>
              <label className="field">
                Email
                <input className="text-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button className="btn btn-primary" type="button" disabled={busy || !email} onClick={() => void sendCode()}>
                {busy ? 'Sending…' : 'Email me a code'}
              </button>
            </>
          ) : (
            <>
              <p className="lede">Sent to {email}. Check that inbox (and spam) for a 6-digit code.</p>
              {debugCode && <p className="notice">Local debug code: {debugCode}</p>}
              <label className="field">
                Code
                <input className="text-input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <button className="btn btn-primary" type="button" disabled={busy || code.length !== 6} onClick={() => void verify()}>
                {busy ? 'Checking…' : 'Sign in'}
              </button>
            </>
          )}
          {error && <p className="lede">{error}</p>}
        </section>
      )}

      {stage === 'app' && (
        <>
          <p className="lede">
            Signed in as {me}.{' '}
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                void api('/api/admin/logout', { method: 'POST' }).then(() => {
                  setStage('login');
                  setMe('');
                });
              }}
            >
              Sign out
            </button>
          </p>

          <div className="admin-cards">
            {surveys.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={survey === item.slug ? 'admin-card on' : 'admin-card'}
                onClick={() => {
                  setSurvey(item.slug);
                  setStart(item.open_start ?? '');
                  setEnd(item.open_end ?? '');
                }}
              >
                <strong>{item.title}</strong>
                <span>{item.total} responses · {item.flagged} flagged</span>
                <span>{item.archived ? 'Archived' : item.window.open ? 'Open' : 'Closed'}</span>
              </button>
            ))}
          </div>

          {selected && (
            <section className="glass">
              <h2>Dates and archive · {selected.title}</h2>
              <p className="lede">{selected.window.label} Current month key: {selected.window.month}.</p>
              <div className="admin-dates">
                <label className="field">
                  Open from
                  <input className="text-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label className="field">
                  Open until
                  <input className="text-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </label>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    void api('/api/admin/surveys', {
                      method: 'POST',
                      body: JSON.stringify({ slug: survey, action: 'dates', open_start: start || null, open_end: end || null }),
                    }).then(() => loadOverview());
                  }}
                >
                  Save dates
                </button>
              </div>
              <div className="pick-extra">
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    void api('/api/admin/surveys', {
                      method: 'POST',
                      body: JSON.stringify({ slug: survey, action: selected.archived ? 'unarchive' : 'archive' }),
                    }).then(() => loadOverview());
                  }}
                >
                  {selected.archived ? 'Unarchive' : 'Archive (close)'}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    if (!confirm(`Delete all current-period responses for ${selected.title}? This cannot be undone.`)) return;
                    void api('/api/admin/surveys', { method: 'POST', body: JSON.stringify({ slug: survey, action: 'restart' }) }).then(
                      () => {
                        void loadOverview();
                        void loadRows();
                      },
                    );
                  }}
                >
                  Restart current period
                </button>
              </div>
            </section>
          )}

          <section className="glass">
            <h2>Responses</h2>
            <label className="weight-toggle">
              <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
              Flagged / suspicious only
            </label>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Answers</th>
                    <th>Flags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.flagged || (row.reasons && row.reasons.length) ? 'suspect' : undefined}>
                      <td>
                        <div>{when(row.created_at)}</div>
                        <div className="muted">{row.poll_month || row.id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <div><code>{row.ip || '—'}</code></div>
                        <div>{row.country || '—'}{row.asn ? ` · ASN ${row.asn}` : ''}</div>
                        {typeof row.bot_score === 'number' && <div>bot {row.bot_score}</div>}
                        <div className="ua" title={row.user_agent ?? ''}>{row.user_agent || 'no UA'}</div>
                      </td>
                      <td>
                        {row.postcode && <div>{row.postcode} {row.state} · {row.age}</div>}
                        {row.location && <div>{row.location} {row.postcode || ''}</div>}
                        {row.vic_now && <div>Vic {row.vic_now} · Fed {row.federal_now}</div>}
                        {typeof row.score === 'number' && <div>Score {row.score}/{row.max}</div>}
                      </td>
                      <td>
                        {row.flagged ? <strong>Flagged</strong> : null}
                        <ul className="flag-list">
                          {(row.reasons ?? []).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        {row.flag_reason && <div className="muted">{row.flag_reason}</div>}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => {
                            void api(`/api/admin/responses/${survey}/${row.id}/flag`, {
                              method: 'POST',
                              body: JSON.stringify({ flagged: !row.flagged }),
                            }).then(() => loadRows());
                          }}
                        >
                          {row.flagged ? 'Unflag' : 'Flag'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => {
                            if (!confirm('Delete this response permanently?')) return;
                            void api(`/api/admin/responses/${survey}/${row.id}`, { method: 'DELETE' }).then(() => {
                              void loadOverview();
                              void loadRows();
                            });
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <p className="lede">No rows.</p>}
          </section>
        </>
      )}
    </div>
  );
}
