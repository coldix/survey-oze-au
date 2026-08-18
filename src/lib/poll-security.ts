export function clientIp(request: Request): string {
  const cf = request.headers.get('CF-Connecting-IP')?.trim();
  if (cf) return cf;
  const forwarded = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  return forwarded || '0.0.0.0';
}

export function isLikelyBot(request: Request, body: Record<string, string>, openedAt: number, now = Date.now()): string | null {
  if ((body.website ?? '').trim() !== '' || (body.company ?? '').trim() !== '') {
    return 'ignored';
  }
  const elapsed = now - openedAt;
  if (!Number.isFinite(openedAt) || elapsed < 4000) return 'too-fast';
  if (elapsed > 1000 * 60 * 60 * 6) return 'stale';
  const ua = request.headers.get('User-Agent') ?? '';
  if (ua.length < 12) return 'ua';
  const cf = request.cf as { botManagement?: { score?: number }; asOrganization?: string } | undefined;
  const score = cf?.botManagement?.score;
  if (typeof score === 'number' && score < 25) return 'cf-bot';
  return null;
}
