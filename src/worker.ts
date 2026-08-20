import { buildCommunityStats } from './lib/community';
import { describePollWindow, isValidMonthKey } from './lib/poll-window';
import { summarisePollMonth, type PollRow } from './lib/poll-results';
import { INTENTION_OPTIONS, LAST_VOTE_OPTIONS } from './lib/poll-math';
import { clientIp, isLikelyBot } from './lib/poll-security';
import { normalisePostcode, stateFromPostcode } from './lib/postcode';
import { getSurvey } from './lib/surveys';
import { scoreSurvey } from './lib/score';
import type { Answers } from './lib/types';
import { summariseIssuesMonth, type IssuesRow } from './lib/issues-results';
import { parseStoredAnswers, validateIssuesAnswers } from './lib/issues-survey';

const MAX_BODY_BYTES = 40_000;

function json(data: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function submit(request: Request, env: Env): Promise<Response> {
  const length = Number(request.headers.get('content-length') || '0');
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: 'Payload too large.' }, 413);

  let body: { slug?: string; answers?: Answers; clientId?: string };
  try {
    body = (await request.json()) as { slug?: string; answers?: Answers; clientId?: string };
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, 400);
  }

  const slug = body.slug?.trim() ?? '';
  const survey = getSurvey(slug);
  if (!survey || !body.answers || typeof body.answers !== 'object') {
    return json({ ok: false, error: 'Unknown survey or missing answers.' }, 400);
  }

  const { score, max } = scoreSurvey(survey, body.answers);
  const id = crypto.randomUUID();
  const clientHash = body.clientId ? await sha256Hex(`${slug}:${body.clientId}`) : null;

  if (clientHash) {
    const existing = await env.DB.prepare(
      'SELECT id, score, max_score FROM responses WHERE survey_slug = ? AND client_hash = ? LIMIT 1',
    )
      .bind(slug, clientHash)
      .first<{ id: string; score: number; max_score: number }>();
    if (existing) {
      return json({ ok: true, duplicate: true, id: existing.id, score: existing.score, max: existing.max_score });
    }
  }

  await env.DB.prepare(
    'INSERT INTO responses (id, survey_slug, created_at, client_hash, answers_json, score, max_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, slug, Date.now(), clientHash, JSON.stringify(body.answers), score, max)
    .run();

  return json({ ok: true, id, score, max });
}

async function stats(slug: string, env: Env): Promise<Response> {
  const survey = getSurvey(slug);
  if (!survey) return json({ ok: false, error: 'Unknown survey.' }, 404);
  const { results } = await env.DB.prepare(
    'SELECT answers_json, score, max_score FROM responses WHERE survey_slug = ?',
  )
    .bind(slug)
    .all<{ answers_json: string; score: number | null; max_score: number | null }>();
  return json({ ok: true, schema: 2, ...buildCommunityStats(survey, results ?? []) });
}

const INTENTION_IDS = new Set<string>(INTENTION_OPTIONS.map((option) => option.id));
const LAST_VOTE_IDS = new Set<string>(LAST_VOTE_OPTIONS.map((option) => option.id));
const AGES = new Set(['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+']);
const GENDERS = new Set(['Female', 'Male', 'Non-binary', 'Prefer not to say']);
const ENROLLED = new Set(['yes', 'no', 'unsure']);

async function pollSubmit(request: Request, env: Env): Promise<Response> {
  const window = describePollWindow();
  if (!window.open) return json({ ok: false, error: `Poll is closed. ${window.label}` }, 403);

  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, 400);
  }

  const openedAt = Number(body.openedAt ?? '0');
  const bot = isLikelyBot(request, body, openedAt);
  if (bot === 'ignored') return json({ ok: true, id: crypto.randomUUID() });
  if (bot) return json({ ok: false, error: 'Could not accept that response. Try again in a moment.' }, 429);

  const ip = clientIp(request);
  const ipHash = await sha256Hex(`poll-ip:${window.month}:${ip}`);
  const hour = Math.floor(Date.now() / 3_600_000);
  const rate = await env.DB.prepare('SELECT hits FROM poll_rate WHERE ip_hash = ? AND bucket = ?')
    .bind(ipHash, hour)
    .first<{ hits: number }>();
  const hits = (rate?.hits ?? 0) + 1;
  await env.DB.prepare(
    'INSERT INTO poll_rate (ip_hash, bucket, hits) VALUES (?, ?, 1) ON CONFLICT(ip_hash, bucket) DO UPDATE SET hits = hits + 1',
  )
    .bind(ipHash, hour)
    .run();
  if (hits > 8) return json({ ok: false, error: 'Too many attempts from this network. Try later.' }, 429);

  const postcode = normalisePostcode(body.postcode ?? '');
  const state = postcode ? stateFromPostcode(postcode) : null;
  if (!postcode || !state) return json({ ok: false, error: 'Enter a valid Australian postcode.' }, 400);
  if (!AGES.has(body.age ?? '') || !GENDERS.has(body.gender ?? '') || !ENROLLED.has(body.enrolled ?? '')) {
    return json({ ok: false, error: 'Complete every question.' }, 400);
  }
  if (!INTENTION_IDS.has(body.vic_now ?? '') || !INTENTION_IDS.has(body.federal_now ?? '')) {
    return json({ ok: false, error: 'Choose a voting intention for both contests.' }, 400);
  }
  if (!LAST_VOTE_IDS.has(body.vic_last ?? '') || !LAST_VOTE_IDS.has(body.federal_last ?? '') || body.federal_last === 'not_vic') {
    return json({ ok: false, error: 'Complete the last-election questions.' }, 400);
  }

  const clientId = (body.clientId ?? '').trim();
  if (!clientId) return json({ ok: false, error: 'Missing client id.' }, 400);
  const clientHash = await sha256Hex(`monthly-poll:${window.month}:${clientId}`);
  const existing = await env.DB.prepare(
    'SELECT id FROM poll_responses WHERE poll_month = ? AND (client_hash = ? OR ip_hash = ?) LIMIT 1',
  )
    .bind(window.month, clientHash, ipHash)
    .first<{ id: string }>();
  if (existing) return json({ ok: true, duplicate: true, id: existing.id });

  const cf = request.cf as { botManagement?: { score?: number }; asn?: number; country?: string } | undefined;
  const id = crypto.randomUUID();
  const ua = (request.headers.get('User-Agent') ?? '').slice(0, 300);
  try {
    await env.DB.prepare(
      `INSERT INTO poll_responses
        (id, poll_month, created_at, client_hash, postcode, state, age, gender, enrolled, vic_now, federal_now, vic_last, federal_last, ip, ip_hash, user_agent, country, asn, bot_score, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live')`,
    )
      .bind(
        id,
        window.month,
        Date.now(),
        clientHash,
        postcode,
        state,
        body.age,
        body.gender,
        body.enrolled,
        body.vic_now,
        body.federal_now,
        body.vic_last,
        body.federal_last,
        ip,
        ipHash,
        ua,
        cf?.country ?? request.headers.get('CF-IPCountry'),
        cf?.asn ?? null,
        cf?.botManagement?.score ?? null,
      )
      .run();
  } catch {
    return json({ ok: true, duplicate: true });
  }
  return json({ ok: true, id });
}

async function pollResults(url: URL, env: Env): Promise<Response> {
  const window = describePollWindow();
  const requested = url.searchParams.get('month') ?? '';
  const month = isValidMonthKey(requested) ? requested : window.resultsMonth;
  const { results } = await env.DB.prepare(
    'SELECT postcode, state, enrolled, vic_now, federal_now, source FROM poll_responses WHERE poll_month = ?',
  )
    .bind(month)
    .all<PollRow>();
  const { results: monthRows } = await env.DB.prepare(
    'SELECT DISTINCT poll_month FROM poll_responses ORDER BY poll_month DESC',
  ).all<{ poll_month: string }>();
  return json({
    ok: true,
    window,
    ...summarisePollMonth(month, results ?? []),
    months: (monthRows ?? []).map((row) => row.poll_month),
  });
}

type IssuesBody = {
  clientId?: string;
  openedAt?: number | string;
  website?: string;
  location?: string;
  postcode?: string;
  age?: string;
  enrolled?: string;
  ratings?: unknown;
  top3?: unknown;
  picks?: unknown;
};

async function issuesSubmit(request: Request, env: Env): Promise<Response> {
  const window = describePollWindow();
  if (!window.open) return json({ ok: false, error: `Survey is closed. ${window.label}` }, 403);

  const length = Number(request.headers.get('content-length') || '0');
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: 'Payload too large.' }, 413);

  let body: IssuesBody;
  try {
    body = (await request.json()) as IssuesBody;
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, 400);
  }

  const openedAt = Number(body.openedAt ?? '0');
  const bot = isLikelyBot(request, { website: body.website ?? '', openedAt: String(openedAt) }, openedAt);
  if (bot === 'ignored') return json({ ok: true, id: crypto.randomUUID() });
  if (bot) return json({ ok: false, error: 'Could not accept that response. Try again in a moment.' }, 429);

  const answers = validateIssuesAnswers(body);
  if (typeof answers === 'string') return json({ ok: false, error: answers }, 400);

  const ip = clientIp(request);
  const ipHash = await sha256Hex(`issues-ip:${window.month}:${ip}`);
  const hour = Math.floor(Date.now() / 3_600_000);
  const rate = await env.DB.prepare('SELECT hits FROM poll_rate WHERE ip_hash = ? AND bucket = ?')
    .bind(ipHash, hour)
    .first<{ hits: number }>();
  const hits = (rate?.hits ?? 0) + 1;
  await env.DB.prepare(
    'INSERT INTO poll_rate (ip_hash, bucket, hits) VALUES (?, ?, 1) ON CONFLICT(ip_hash, bucket) DO UPDATE SET hits = hits + 1',
  )
    .bind(ipHash, hour)
    .run();
  if (hits > 8) return json({ ok: false, error: 'Too many attempts from this network. Try later.' }, 429);

  let postcode: string | null = null;
  let state: string | null = null;
  if (answers.location === 'overseas') {
    if ((body.postcode ?? '').trim()) return json({ ok: false, error: 'Leave postcode blank if you live outside Australia.' }, 400);
  } else {
    postcode = normalisePostcode(body.postcode ?? '');
    state = postcode ? stateFromPostcode(postcode) : null;
    if (!postcode || !state) return json({ ok: false, error: 'Enter a valid Australian postcode.' }, 400);
    if (answers.location === 'vic' && state !== 'VIC') {
      return json({ ok: false, error: 'That postcode is not in Victoria. Choose rest of Australia, or check the postcode.' }, 400);
    }
    if (answers.location === 'australia' && state === 'VIC') {
      return json({ ok: false, error: 'That postcode is in Victoria. Choose Victoria, or check the postcode.' }, 400);
    }
  }

  const clientId = (body.clientId ?? '').trim();
  if (!clientId) return json({ ok: false, error: 'Missing client id.' }, 400);
  const clientHash = await sha256Hex(`vic-issues:${window.month}:${clientId}`);
  const existing = await env.DB.prepare(
    'SELECT id FROM issue_responses WHERE poll_month = ? AND client_hash = ? LIMIT 1',
  )
    .bind(window.month, clientHash)
    .first<{ id: string }>();
  if (existing) {
    return json({ ok: false, duplicate: true, error: 'Already counted this month.' }, 409);
  }

  const cf = request.cf as { botManagement?: { score?: number }; asn?: number; country?: string } | undefined;
  const id = crypto.randomUUID();
  const ua = (request.headers.get('User-Agent') ?? '').slice(0, 300);
  try {
    await env.DB.prepare(
      `INSERT INTO issue_responses
        (id, poll_month, created_at, client_hash, location, postcode, state, age, enrolled, answers_json, ip, ip_hash, user_agent, country, asn, bot_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        window.month,
        Date.now(),
        clientHash,
        answers.location,
        postcode,
        state,
        body.age ?? '',
        body.enrolled ?? '',
        JSON.stringify(answers),
        ip,
        ipHash,
        ua,
        cf?.country ?? request.headers.get('CF-IPCountry'),
        cf?.asn ?? null,
        cf?.botManagement?.score ?? null,
      )
      .run();
  } catch {
    return json({ ok: false, duplicate: true, error: 'Already counted this month.' }, 409);
  }
  return json({ ok: true, id });
}

async function issuesResults(url: URL, env: Env): Promise<Response> {
  const window = describePollWindow();
  const requested = url.searchParams.get('month') ?? '';
  const month = isValidMonthKey(requested) ? requested : window.resultsMonth;
  const { results } = await env.DB.prepare(
    'SELECT state, answers_json FROM issue_responses WHERE poll_month = ?',
  )
    .bind(month)
    .all<{ state: string | null; answers_json: string }>();

  const rows: IssuesRow[] = [];
  for (const row of results ?? []) {
    try {
      const answers = parseStoredAnswers(JSON.parse(row.answers_json));
      if (!answers) continue;
      rows.push({ state: row.state, answers });
    } catch {
      continue;
    }
  }

  return json(
    {
      ok: true,
      window,
      ...summariseIssuesMonth(month, rows),
    },
    200,
    'public, max-age=60, s-maxage=60',
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/submit') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return submit(request, env);
    }
    const statsMatch = url.pathname.match(/^\/api\/stats\/([a-z0-9-]+)$/i);
    if (statsMatch) {
      if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return stats(statsMatch[1] ?? '', env);
    }
    if (url.pathname === '/api/poll/submit') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return pollSubmit(request, env);
    }
    if (url.pathname === '/api/poll/results') {
      if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return pollResults(url, env);
    }
    if (url.pathname === '/api/issues/submit') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return issuesSubmit(request, env);
    }
    if (url.pathname === '/api/issues/results') {
      if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return issuesResults(url, env);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
