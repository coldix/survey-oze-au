import { describePollWindow, monthKey, type PollWindow } from './poll-window';

export type SurveySlug = 'monthly-poll' | 'vic-issues' | 'money';

export type SurveySettingRow = {
  slug: string;
  title: string;
  open_start: string | null;
  open_end: string | null;
  archived: number;
  updated_at: number;
};

function melbourneYmd(at: Date): number {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const bits = Object.fromEntries(fmt.formatToParts(at).map((part) => [part.type, part.value]));
  return Number(bits.year) * 10000 + Number(bits.month) * 100 + Number(bits.day);
}

function isoToYmd(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
}

export function windowFromSetting(row: SurveySettingRow, at = new Date()): PollWindow {
  const fallback = describePollWindow(at);
  const ymd = melbourneYmd(at);
  const start = row.open_start ? isoToYmd(row.open_start) : null;
  const end = row.open_end ? isoToYmd(row.open_end) : null;
  const inRange = (start == null || ymd >= start) && (end == null || ymd <= end);
  const open = row.archived ? false : inRange;
  const month = fallback.month;
  return {
    open,
    month,
    resultsMonth: month,
    openStartIso: row.open_start ?? fallback.openStartIso,
    openEndIso: row.open_end ?? fallback.openEndIso,
    label: row.archived
      ? `${row.title} is archived.`
      : open
        ? `Open now${row.open_end ? ` — through ${row.open_end}` : ''}.`
        : start && ymd < start
          ? `Opens ${row.open_start}.`
          : `Closed${row.open_end ? ` after ${row.open_end}` : ''}.`,
  };
}

export async function loadSurveyWindow(env: Env, slug: SurveySlug, at = new Date()): Promise<PollWindow> {
  try {
    const row = await env.DB.prepare(
      'SELECT slug, title, open_start, open_end, archived, updated_at FROM survey_settings WHERE slug = ?',
    )
      .bind(slug)
      .first<SurveySettingRow>();
    if (row) return windowFromSetting(row, at);
  } catch {
    /* settings table not migrated yet */
  }
  if (slug === 'money') {
    const now = at;
    const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit' });
    const bits = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
    const month = monthKey(Number(bits.year), Number(bits.month));
    return { open: true, month, resultsMonth: month, openStartIso: '', openEndIso: '', label: 'Open.' };
  }
  return describePollWindow(at);
}

export async function loadAllSettings(env: Env): Promise<SurveySettingRow[]> {
  const { results } = await env.DB.prepare(
    'SELECT slug, title, open_start, open_end, archived, updated_at FROM survey_settings ORDER BY slug',
  ).all<SurveySettingRow>();
  return results ?? [];
}
