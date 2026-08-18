export type AuState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

export function normalisePostcode(value: string): string | null {
  const digits = value.replace(/\s+/g, '');
  if (!/^\d{4}$/.test(digits)) return null;
  return digits;
}

export function stateFromPostcode(postcode: string): AuState | null {
  const n = Number(postcode);
  if (!Number.isInteger(n) || n < 200 || n > 9999) return null;
  if ((n >= 1000 && n <= 1999) || (n >= 2000 && n <= 2599) || (n >= 2619 && n <= 2899) || (n >= 2921 && n <= 2999)) return 'NSW';
  if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return 'ACT';
  if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return 'VIC';
  if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999)) return 'QLD';
  if (n >= 5000 && n <= 5999) return 'SA';
  if (n >= 6000 && n <= 6797) return 'WA';
  if (n >= 7000 && n <= 7999) return 'TAS';
  if (n >= 800 && n <= 999) return 'NT';
  return null;
}
