export type FlagInput = {
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
  botScore?: number | null;
  asn?: number | null;
  elapsedMs?: number | null;
  pickMs?: number[] | null;
};

export function suspicionReasons(row: FlagInput): string[] {
  const reasons: string[] = [];
  if (row.ip === '0.0.0.0' || !row.ip) reasons.push('Missing IP');
  if (row.userAgent && row.userAgent.length < 20) reasons.push('Short user-agent');
  if (!row.userAgent) reasons.push('No user-agent');
  if (typeof row.botScore === 'number' && row.botScore < 50) reasons.push(`Low bot score (${row.botScore})`);
  if (row.country && row.country !== 'AU' && row.country !== 'XX') reasons.push(`Country ${row.country}`);
  if (typeof row.elapsedMs === 'number' && row.elapsedMs < 8000) reasons.push('Very fast complete');
  if (row.pickMs && row.pickMs.length) {
    const fast = row.pickMs.filter((ms) => ms > 0 && ms < 600).length;
    if (fast >= 4) reasons.push(`${fast} comparison taps under 0.6s`);
    const mean = row.pickMs.reduce((sum, ms) => sum + ms, 0) / row.pickMs.length;
    if (mean > 0 && mean < 1200) reasons.push('Fast comparison round');
  }
  return reasons;
}
