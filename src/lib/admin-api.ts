import {
  adminEmails,
  clearCookie,
  hashCode,
  isAllowedAdmin,
  mintSession,
  randomCode,
  readSession,
  sessionCookie,
} from './admin-auth';
import { suspicionReasons } from './admin-flag';
import { loadAllSettings, loadSurveyWindow, type SurveySlug } from './survey-settings';

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function localHost(url: URL): boolean {
  return url.hostname === '127.0.0.1' || url.hostname === 'localhost';
}

const SLUGS: SurveySlug[] = ['monthly-poll', 'vic-issues', 'money'];

function isSlug(value: string): value is SurveySlug {
  return (SLUGS as string[]).includes(value);
}

async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  if (!env.ADMIN_SESSION_SECRET) return json({ ok: false, error: 'Admin is not configured.' }, 503);
  const email = await readSession(env, request.headers.get('Cookie'));
  if (!email) return json({ ok: false, error: 'Sign in required.' }, 401);
  return email;
}

async function sendCodeEmail(env: Env, to: string, code: string): Promise<void> {
  if (!env.EMAIL) throw new Error('Email sending is not configured.');
  const html = `<p>Your survey.oze.net.au admin code is <strong style="font-size:1.4rem;letter-spacing:.12em">${code}</strong></p><p>It expires in 10 minutes. If you did not request this, ignore the email.</p>`;
  await env.EMAIL.send({
    to,
    from: { email: 'surveys@oze.net.au', name: 'oze surveys' },
    subject: `${code} — admin sign-in`,
    html,
    text: `Your admin code is ${code}. It expires in 10 minutes.`,
  });
}

export async function handleAdmin(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/admin')) return null;
  if (url.pathname === '/api/admin/login' && request.method === 'POST') return login(request, env);
  if (url.pathname === '/api/admin/verify' && request.method === 'POST') return verify(request, env);
  if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(url.protocol === 'https:') });
  }

  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  if (url.pathname === '/api/admin/me' && request.method === 'GET') {
    return json({ ok: true, email: auth });
  }
  if (url.pathname === '/api/admin/overview' && request.method === 'GET') {
    return overview(env);
  }
  if (url.pathname === '/api/admin/responses' && request.method === 'GET') {
    return listResponses(url, env);
  }
  const del = url.pathname.match(/^\/api\/admin\/responses\/([a-z0-9-]+)\/([0-9a-f-]{36})$/i);
  if (del && request.method === 'DELETE') {
    return deleteResponse(del[1] ?? '', del[2] ?? '', env);
  }
  const flag = url.pathname.match(/^\/api\/admin\/responses\/([a-z0-9-]+)\/([0-9a-f-]{36})\/flag$/i);
  if (flag && request.method === 'POST') {
    return flagResponse(flag[1] ?? '', flag[2] ?? '', request, env);
  }
  if (url.pathname === '/api/admin/surveys' && request.method === 'GET') {
    return listSurveys(env);
  }
  if (url.pathname === '/api/admin/surveys' && request.method === 'POST') {
    return updateSurvey(request, env, auth);
  }
  return json({ ok: false, error: 'Not found.' }, 404);
}

async function login(request: Request, env: Env): Promise<Response> {
  if (!env.ADMIN_SESSION_SECRET) return json({ ok: false, error: 'Admin is not configured.' }, 503);
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'Enter a valid email.' }, 400);
  if (!isAllowedAdmin(env, email)) {
    return json({ ok: true });
  }
  const code = randomCode();
  const codeHash = await hashCode(email, code);
  await env.DB.prepare(
    `INSERT INTO admin_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, created_at = excluded.created_at`,
  )
    .bind(email, codeHash, Date.now() + 10 * 60 * 1000, Date.now())
    .run();
  const url = new URL(request.url);
  try {
    await sendCodeEmail(env, email, code);
  } catch (error) {
    if (localHost(url)) {
      return json({ ok: true, debugCode: code, warning: error instanceof Error ? error.message : 'Email send failed' });
    }
    return json({ ok: false, error: 'Could not send the sign-in email. Check Email Sending for oze.net.au.' }, 503);
  }
  return json({ ok: true, ...(localHost(url) ? { debugCode: code } : {}) });
}

async function verify(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; code?: string };
  try {
    body = (await request.json()) as { email?: string; code?: string };
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').trim();
  if (!email || !/^\d{6}$/.test(code)) return json({ ok: false, error: 'Enter the 6-digit code.' }, 400);
  const row = await env.DB.prepare('SELECT code_hash, expires_at FROM admin_codes WHERE email = ?')
    .bind(email)
    .first<{ code_hash: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return json({ ok: false, error: 'That code has expired. Request a new one.' }, 401);
  const hash = await hashCode(email, code);
  if (hash !== row.code_hash) return json({ ok: false, error: 'That code is not correct.' }, 401);
  await env.DB.prepare('DELETE FROM admin_codes WHERE email = ?').bind(email).run();
  const token = await mintSession(env, email);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ ok: true, email }, 200, { 'Set-Cookie': sessionCookie(token, secure) });
}

async function overview(env: Env): Promise<Response> {
  const count = async (sql: string) => {
    const row = await env.DB.prepare(sql).first<{ n: number }>();
    return Number(row?.n ?? 0);
  };
  const settings = await loadAllSettings(env);
  const surveys = [];
  for (const row of settings) {
    const slug = row.slug as SurveySlug;
    const window = await loadSurveyWindow(env, slug);
    let total = 0;
    let flagged = 0;
    if (slug === 'monthly-poll') {
      total = await count('SELECT COUNT(*) as n FROM poll_responses');
      flagged = await count('SELECT COUNT(*) as n FROM poll_responses WHERE flagged = 1');
    } else if (slug === 'vic-issues') {
      total = await count('SELECT COUNT(*) as n FROM issue_responses');
      flagged = await count('SELECT COUNT(*) as n FROM issue_responses WHERE flagged = 1');
    } else {
      total = await count("SELECT COUNT(*) as n FROM responses WHERE survey_slug = 'money'");
      flagged = await count("SELECT COUNT(*) as n FROM responses WHERE survey_slug = 'money' AND flagged = 1");
    }
    surveys.push({ ...row, window, total, flagged });
  }
  return json({ ok: true, admins: adminEmails(env), surveys });
}

async function listSurveys(env: Env): Promise<Response> {
  const settings = await loadAllSettings(env);
  const archives = (await env.DB.prepare(
    'SELECT id, slug, label, created_at, response_count FROM survey_archives ORDER BY created_at DESC LIMIT 50',
  ).all<{ id: string; slug: string; label: string; created_at: number; response_count: number }>()).results ?? [];
  return json({ ok: true, settings, archives });
}

async function listResponses(url: URL, env: Env): Promise<Response> {
  const slug = url.searchParams.get('survey') ?? 'monthly-poll';
  const flaggedOnly = url.searchParams.get('flagged') === '1';
  const month = url.searchParams.get('month') ?? '';
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '80') || 80));
  if (!isSlug(slug)) return json({ ok: false, error: 'Unknown survey.' }, 400);

  if (slug === 'monthly-poll') {
    const where = [flaggedOnly ? 'flagged = 1' : '1=1', month ? 'poll_month = ?' : '1=1'];
    const sql = `SELECT id, poll_month, created_at, postcode, state, age, gender, enrolled, vic_now, federal_now, ip, user_agent, country, asn, bot_score, flagged, flag_reason, source
      FROM poll_responses WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`;
    const binds = month ? [month, limit] : [limit];
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const rows = (results ?? []).map((row) => {
      const reasons = suspicionReasons({
        ip: row.ip as string,
        country: row.country as string,
        userAgent: row.user_agent as string,
        botScore: row.bot_score as number,
      });
      return { ...row, reasons, survey: slug };
    });
    return json({ ok: true, rows });
  }

  if (slug === 'vic-issues') {
    const where = [flaggedOnly ? 'r.flagged = 1' : '1=1', month ? 'r.poll_month = ?' : '1=1'];
    const sql = `SELECT r.id, r.poll_month, r.created_at, r.location, r.postcode, r.state, r.age, r.enrolled,
        r.top3_json, r.unweighted_json, r.ip, r.user_agent, r.country, r.asn, r.bot_score, r.flagged, r.flag_reason, r.source,
        (SELECT GROUP_CONCAT(ms_to_pick) FROM issue_picks p WHERE p.response_id = r.id) as pick_ms
      FROM issue_responses r WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC LIMIT ?`;
    const binds = month ? [month, limit] : [limit];
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const rows = (results ?? []).map((row) => {
      const pickMs = String(row.pick_ms ?? '')
        .split(',')
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
      const reasons = suspicionReasons({
        ip: row.ip as string,
        country: row.country as string,
        userAgent: row.user_agent as string,
        botScore: row.bot_score as number,
        pickMs,
      });
      return { ...row, pickMs, reasons, survey: slug };
    });
    return json({ ok: true, rows });
  }

  const where = [flaggedOnly ? 'flagged = 1' : '1=1', "survey_slug = 'money'"];
  const { results } = await env.DB.prepare(
    `SELECT id, created_at, score, max_score, ip, user_agent, country, flagged, flag_reason, answers_json
     FROM responses WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all();
  const rows = (results ?? []).map((row) => {
    const reasons = suspicionReasons({
      ip: row.ip as string,
      country: row.country as string,
      userAgent: row.user_agent as string,
    });
    return { ...row, answers_json: undefined, score: row.score, max: row.max_score, reasons, survey: slug };
  });
  return json({ ok: true, rows });
}

async function deleteResponse(survey: string, id: string, env: Env): Promise<Response> {
  if (!isSlug(survey)) return json({ ok: false, error: 'Unknown survey.' }, 400);
  if (survey === 'monthly-poll') {
    await env.DB.prepare('DELETE FROM poll_responses WHERE id = ?').bind(id).run();
  } else if (survey === 'vic-issues') {
    await env.DB.prepare('DELETE FROM issue_picks WHERE response_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM issue_responses WHERE id = ?').bind(id).run();
  } else {
    await env.DB.prepare('DELETE FROM responses WHERE id = ? AND survey_slug = ?').bind(id, 'money').run();
  }
  return json({ ok: true });
}

async function flagResponse(survey: string, id: string, request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { flagged?: boolean; reason?: string };
  const flagged = body.flagged === false ? 0 : 1;
  const reason = (body.reason ?? '').slice(0, 300) || (flagged ? 'Marked in admin' : null);
  if (survey === 'monthly-poll') {
    await env.DB.prepare('UPDATE poll_responses SET flagged = ?, flag_reason = ? WHERE id = ?').bind(flagged, reason, id).run();
  } else if (survey === 'vic-issues') {
    await env.DB.prepare('UPDATE issue_responses SET flagged = ?, flag_reason = ? WHERE id = ?').bind(flagged, reason, id).run();
  } else {
    await env.DB.prepare('UPDATE responses SET flagged = ?, flag_reason = ? WHERE id = ?').bind(flagged, reason, id).run();
  }
  return json({ ok: true });
}

async function updateSurvey(request: Request, env: Env, actor: string): Promise<Response> {
  const body = (await request.json()) as {
    slug?: string;
    action?: 'dates' | 'archive' | 'unarchive' | 'restart';
    open_start?: string | null;
    open_end?: string | null;
    label?: string;
  };
  const slug = body.slug ?? '';
  if (!isSlug(slug)) return json({ ok: false, error: 'Unknown survey.' }, 400);
  const now = Date.now();

  if (body.action === 'dates') {
    const start = body.open_start?.trim() || null;
    const end = body.open_end?.trim() || null;
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return json({ ok: false, error: 'open_start must be YYYY-MM-DD.' }, 400);
    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return json({ ok: false, error: 'open_end must be YYYY-MM-DD.' }, 400);
    await env.DB.prepare(
      'UPDATE survey_settings SET open_start = ?, open_end = ?, updated_at = ? WHERE slug = ?',
    )
      .bind(start, end, now, slug)
      .run();
    return json({ ok: true });
  }

  if (body.action === 'archive' || body.action === 'unarchive') {
    const archived = body.action === 'archive' ? 1 : 0;
    await env.DB.prepare('UPDATE survey_settings SET archived = ?, updated_at = ? WHERE slug = ?').bind(archived, now, slug).run();
    if (archived) {
      let count = 0;
      if (slug === 'monthly-poll') {
        count = Number((await env.DB.prepare('SELECT COUNT(*) as n FROM poll_responses').first<{ n: number }>())?.n ?? 0);
      } else if (slug === 'vic-issues') {
        count = Number((await env.DB.prepare('SELECT COUNT(*) as n FROM issue_responses').first<{ n: number }>())?.n ?? 0);
      } else {
        count = Number(
          (await env.DB.prepare("SELECT COUNT(*) as n FROM responses WHERE survey_slug = 'money'").first<{ n: number }>())?.n ?? 0,
        );
      }
      const label = (body.label ?? '').trim() || `Archived ${new Date(now).toISOString().slice(0, 10)} by ${actor}`;
      await env.DB.prepare(
        'INSERT INTO survey_archives (id, slug, label, created_at, response_count) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(crypto.randomUUID(), slug, label, now, count)
        .run();
    }
    return json({ ok: true });
  }

  if (body.action === 'restart') {
    const window = await loadSurveyWindow(env, slug);
    if (slug === 'monthly-poll') {
      await env.DB.prepare('DELETE FROM poll_responses WHERE poll_month = ?').bind(window.month).run();
    } else if (slug === 'vic-issues') {
      await env.DB.prepare(
        `DELETE FROM issue_picks WHERE response_id IN (SELECT id FROM issue_responses WHERE poll_month = ?)`,
      )
        .bind(window.month)
        .run();
      await env.DB.prepare('DELETE FROM issue_responses WHERE poll_month = ?').bind(window.month).run();
      await env.DB.prepare('DELETE FROM issue_rounds WHERE poll_month = ?').bind(window.month).run();
    } else {
      await env.DB.prepare("DELETE FROM responses WHERE survey_slug = 'money'").run();
    }
    await env.DB.prepare('UPDATE survey_settings SET archived = 0, updated_at = ? WHERE slug = ?').bind(now, slug).run();
    return json({ ok: true, month: window.month });
  }

  return json({ ok: false, error: 'Unknown action.' }, 400);
}
