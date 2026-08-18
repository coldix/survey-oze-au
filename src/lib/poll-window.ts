const TZ = 'Australia/Melbourne';

export type PollWindow = {
  open: boolean;
  month: string;
  resultsMonth: string;
  openStartIso: string;
  openEndIso: string;
  label: string;
};

function melbourneParts(at: Date): { year: number; month: number; day: number; daysInMonth: number } {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const bits = Object.fromEntries(fmt.formatToParts(at).map((part) => [part.type, part.value]));
  const year = Number(bits.year);
  const month = Number(bits.month);
  const day = Number(bits.day);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day, daysInMonth };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

const SERIES_START = 20260818;
const SERIES_END = 20261128;

export function describePollWindow(at = new Date()): PollWindow {
  const { year, month, day, daysInMonth } = melbourneParts(at);
  const ymd = year * 10000 + month * 100 + day;
  const open = ymd >= SERIES_START && ymd <= SERIES_END;
  const key = monthKey(year, month);
  const inSeriesMonth = ymd >= SERIES_START && year === 2026 && month >= 8 && month <= 11;
  const resultsMonth = open || inSeriesMonth ? key : ymd > SERIES_END ? '2026-11' : key;
  const monthEndDay = year === 2026 && month === 11 ? 28 : daysInMonth;
  return {
    open,
    month: key,
    resultsMonth,
    openStartIso: key === '2026-08' ? '2026-08-18' : `${key}-01`,
    openEndIso: `${key}-${String(monthEndDay).padStart(2, '0')}`,
    label: open
      ? `Open now — ${monthName(month)} snapshot, through ${monthEndDay === 28 && month === 11 ? 'election day 28 November' : `the end of ${monthName(month)}`}. Series ends 28 November 2026.`
      : ymd > SERIES_END
        ? 'Closed after the Victorian election (28 November 2026). Results below are the last month.'
        : `Opens 18 August 2026 · runs each month until 28 November.`,
  };
}

function monthName(month: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1] ?? '';
}

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
