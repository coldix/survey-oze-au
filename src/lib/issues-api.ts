import { BLIND_CLAIMS, ISSUE_SET, MATRIX_HASH } from '../data/vic-issues-claims';
import { clientIp, isLikelyBot } from './poll-security';
import { isValidMonthKey } from './poll-window';
import { loadSurveyWindow } from './survey-settings';
import { suspicionReasons } from './admin-flag';
import { normalisePostcode, stateFromPostcode } from './postcode';
import { buildRound, parseShown, type ShownOrder } from './issues-round';
import {
  chosenFromSlot,
  COMPARE_SLUGS,
  validateBlindPicks,
  validateRatingsAndYou,
} from './issues-survey';
import {
  pickHeadline,
  PICK_PARTY_LABELS,
  type Chosen,
  type PickParty,
  type RevealPayload,
  unweightedShares,
  weightedShares,
  type PickRow,
} from './issues-math';
import { summariseIssuesMonth, type RatingRow, type SqlPickRow } from './issues-results';
import { issueBySlug } from './issues-survey';

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

async function clientHashFor(clientId: string, month: string): Promise<string> {
  return sha256Hex(`vic-issues:${month}:${clientId}`);
}

function revealFrom(picks: PickRow[], ratings: Record<string, number>, top3: string[], _shown: ShownOrder): RevealPayload {
  const detailed: RevealPayload['picks'] = COMPARE_SLUGS.map((slug) => {
    const pick = picks.find((row) => row.slug === slug);
    const chosen = pick?.chosen ?? 'none';
    const claim =
      chosen === 'none' || chosen === 'cant_choose'
        ? chosen === 'none'
          ? 'None of these come close'
          : "Can't choose between them"
        : (BLIND_CLAIMS[slug]?.[chosen] ?? '');
    return {
      slug,
      name: issueBySlug(slug)?.name ?? slug,
      claim,
      chosen,
      partyLabel: chosen === 'none' || chosen === 'cant_choose' ? null : PICK_PARTY_LABELS[chosen],
    };
  });
  return {
    headline: pickHeadline(picks),
    picks: detailed,
    unweighted: unweightedShares(picks),
    weighted: weightedShares(picks),
    ratings,
    top3,
  };
}

export async function issuesRound(request: Request, env: Env): Promise<Response> {
  const window = await loadSurveyWindow(env, 'vic-issues');
  if (!window.open) return json({ ok: false, error: `Survey is closed. ${window.label}` }, 403);
  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId')?.trim() ?? '';
  if (!clientId) return json({ ok: false, error: 'Missing client id.' }, 400);
  const clientHash = await clientHashFor(clientId, window.month);
  const existing = await env.DB.prepare(
    'SELECT shown_json, matrix_hash FROM issue_rounds WHERE poll_month = ? AND client_hash = ?',
  )
    .bind(window.month, clientHash)
    .first<{ shown_json: string; matrix_hash: string }>();

  let shown: ShownOrder | undefined;
  if (existing && existing.matrix_hash === MATRIX_HASH) {
    shown = parseShown(existing.shown_json) ?? undefined;
  }
  const round = buildRound(shown);
  if (!existing || existing.matrix_hash !== MATRIX_HASH) {
    await env.DB.prepare(
      `INSERT INTO issue_rounds (poll_month, client_hash, matrix_hash, shown_json, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(poll_month, client_hash) DO UPDATE SET matrix_hash = excluded.matrix_hash, shown_json = excluded.shown_json, created_at = excluded.created_at`,
    )
      .bind(window.month, clientHash, MATRIX_HASH, JSON.stringify(round.shown), Date.now())
      .run();
  }
  return json({ ok: true, month: window.month, matrixHash: MATRIX_HASH, issues: round.issues });
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

async function loadReveal(env: Env, id: string): Promise<RevealPayload | null> {
  const row = await env.DB.prepare(
    'SELECT ratings_json, top3_json FROM issue_responses WHERE id = ?',
  ).bind(id).first<{ ratings_json: string; top3_json: string }>();
  if (!row) return null;
  const { results } = await env.DB.prepare(
    'SELECT issue_slug, chosen, chosen_slot, shown_order, rating FROM issue_picks WHERE response_id = ?',
  )
    .bind(id)
    .all<{ issue_slug: string; chosen: Chosen; shown_order: string; rating: number }>();
  const ratings = JSON.parse(row.ratings_json) as Record<string, number>;
  const top3 = JSON.parse(row.top3_json) as string[];
  const shown: ShownOrder = {};
  const picks: PickRow[] = [];
  for (const item of results ?? []) {
    shown[item.issue_slug] = JSON.parse(item.shown_order) as PickParty[];
    picks.push({ slug: item.issue_slug, chosen: item.chosen, rating: item.rating });
  }
  return revealFrom(picks, ratings, top3, shown);
}

export async function issuesSubmit(request: Request, env: Env): Promise<Response> {
  const window = await loadSurveyWindow(env, 'vic-issues');
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

  const you = validateRatingsAndYou(body);
  if (typeof you === 'string') return json({ ok: false, error: you }, 400);
  const blind = validateBlindPicks(body.picks);
  if (typeof blind === 'string') return json({ ok: false, error: blind }, 400);

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
  if (you.location === 'overseas') {
    if ((body.postcode ?? '').trim()) return json({ ok: false, error: 'Leave postcode blank if you live outside Australia.' }, 400);
  } else {
    postcode = normalisePostcode(body.postcode ?? '');
    state = postcode ? stateFromPostcode(postcode) : null;
    if (!postcode || !state) return json({ ok: false, error: 'Enter a valid Australian postcode.' }, 400);
    if (you.location === 'vic' && state !== 'VIC') {
      return json({ ok: false, error: 'That postcode is not in Victoria. Choose rest of Australia, or check the postcode.' }, 400);
    }
    if (you.location === 'australia' && state === 'VIC') {
      return json({ ok: false, error: 'That postcode is in Victoria. Choose Victoria, or check the postcode.' }, 400);
    }
  }

  const clientId = (body.clientId ?? '').trim();
  if (!clientId) return json({ ok: false, error: 'Missing client id.' }, 400);
  const clientHash = await clientHashFor(clientId, window.month);

  const existing = await env.DB.prepare(
    'SELECT id FROM issue_responses WHERE poll_month = ? AND client_hash = ? LIMIT 1',
  )
    .bind(window.month, clientHash)
    .first<{ id: string }>();
  if (existing) {
    const reveal = await loadReveal(env, existing.id);
    return json({ ok: false, duplicate: true, error: 'Already counted this month.', reveal }, 409);
  }

  const round = await env.DB.prepare(
    'SELECT shown_json, matrix_hash FROM issue_rounds WHERE poll_month = ? AND client_hash = ?',
  )
    .bind(window.month, clientHash)
    .first<{ shown_json: string; matrix_hash: string }>();
  if (!round || round.matrix_hash !== MATRIX_HASH) {
    return json({ ok: false, error: 'Start the comparison round again — the statements have changed.' }, 409);
  }
  const shown = parseShown(round.shown_json);
  if (!shown) return json({ ok: false, error: 'Start the comparison round again.' }, 409);

  const pickRows: PickRow[] = [];
  const resolved: { slug: string; chosen: Chosen; slot: number | null; order: PickParty[]; ms: number; rating: number }[] = [];
  for (const item of blind) {
    const order = shown[item.slug];
    if (!order) return json({ ok: false, error: 'Start the comparison round again.' }, 409);
    const chosen = chosenFromSlot(item.slot, order);
    if (!chosen) return json({ ok: false, error: 'Invalid comparison answer.' }, 400);
    const rating = you.ratings[item.slug];
    if (!rating) return json({ ok: false, error: 'Rate every compared issue.' }, 400);
    pickRows.push({ slug: item.slug, chosen, rating });
    resolved.push({
      slug: item.slug,
      chosen,
      slot: typeof item.slot === 'number' ? item.slot : null,
      order,
      ms: item.ms,
      rating,
    });
  }

  const unweighted = unweightedShares(pickRows);
  const weighted = weightedShares(pickRows);
  const cf = request.cf as { botManagement?: { score?: number }; asn?: number; country?: string } | undefined;
  const id = crypto.randomUUID();
  const ua = (request.headers.get('User-Agent') ?? '').slice(0, 300);

  try {
    await env.DB.prepare(
      `INSERT INTO issue_responses
        (id, poll_month, created_at, client_hash, location, postcode, state, age, enrolled, ratings_json, top3_json, issue_set, matrix_hash, blind, unweighted_json, weighted_json, ip, ip_hash, user_agent, country, asn, bot_score, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'live')`,
    )
      .bind(
        id,
        window.month,
        Date.now(),
        clientHash,
        you.location,
        postcode,
        state,
        you.age,
        you.enrolled,
        JSON.stringify(you.ratings),
        JSON.stringify(you.top3),
        ISSUE_SET.join(','),
        MATRIX_HASH,
        JSON.stringify(unweighted),
        JSON.stringify(weighted),
        ip,
        ipHash,
        ua,
        cf?.country ?? request.headers.get('CF-IPCountry'),
        cf?.asn ?? null,
        cf?.botManagement?.score ?? null,
      )
      .run();
  } catch {
    const again = await env.DB.prepare(
      'SELECT id FROM issue_responses WHERE poll_month = ? AND client_hash = ? LIMIT 1',
    )
      .bind(window.month, clientHash)
      .first<{ id: string }>();
    const reveal = again ? await loadReveal(env, again.id) : null;
    return json({ ok: false, duplicate: true, error: 'Already counted this month.', reveal }, 409);
  }

  const stmt = env.DB.prepare(
    `INSERT INTO issue_picks (response_id, issue_slug, chosen, chosen_slot, shown_order, ms_to_pick, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  await env.DB.batch(
    resolved.map((row) =>
      stmt.bind(id, row.slug, row.chosen, row.slot, JSON.stringify(row.order), row.ms, row.rating),
    ),
  );

  const reasons = suspicionReasons({
    ip,
    country: (cf?.country ?? request.headers.get('CF-IPCountry')) as string | null,
    userAgent: ua,
    botScore: cf?.botManagement?.score ?? null,
    pickMs: resolved.map((row) => row.ms),
  });
  if (reasons.length) {
    await env.DB.prepare('UPDATE issue_responses SET flagged = 1, flag_reason = ? WHERE id = ?')
      .bind(reasons.join('; '), id)
      .run();
  }

  return json({ ok: true, id, reveal: revealFrom(pickRows, you.ratings, you.top3, shown) });
}

export async function issuesResults(url: URL, env: Env): Promise<Response> {
  const window = await loadSurveyWindow(env, 'vic-issues');
  const requested = url.searchParams.get('month') ?? '';
  const month = isValidMonthKey(requested) ? requested : window.resultsMonth;
  const { results: ratingRows } = await env.DB.prepare(
    'SELECT state, ratings_json FROM issue_responses WHERE poll_month = ?',
  )
    .bind(month)
    .all<{ state: string | null; ratings_json: string }>();
  const ratings: RatingRow[] = [];
  for (const row of ratingRows ?? []) {
    try {
      ratings.push({ state: row.state, ratings: JSON.parse(row.ratings_json) as Record<string, number> });
    } catch {
      /* skip */
    }
  }
  const { results: pickRows } = await env.DB.prepare(
    `SELECT p.issue_slug as issue_slug, p.chosen as chosen, COUNT(*) as n,
            SUM(CASE WHEN r.state = 'VIC' THEN 1 ELSE 0 END) as vic,
            SUM(p.rating) as weight
     FROM issue_picks p JOIN issue_responses r ON r.id = p.response_id
     WHERE r.poll_month = ?
     GROUP BY p.issue_slug, p.chosen`,
  )
    .bind(month)
    .all<SqlPickRow>();

  return json(
    {
      ok: true,
      window,
      ...summariseIssuesMonth(month, ratings, pickRows ?? []),
    },
    200,
    'public, max-age=60, stale-while-revalidate=300',
  );
}
