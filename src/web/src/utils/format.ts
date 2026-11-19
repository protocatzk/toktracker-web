const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function fmtEUR(value: unknown): string {
  const number = Number(value);
  return eurFormatter.format(Number.isFinite(number) ? number : 0);
}

export function fmtUSD(value: unknown): string {
  const number = Number(value);
  return usdFormatter.format(Number.isFinite(number) ? number : 0);
}

export function fmtNum(value: unknown): string {
  const number = Number(value);
  return numberFormatter.format(Number.isFinite(number) ? number : 0);
}

export function fmtDate(value?: string | null): string {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export function fmtTime(value?: string | null): string {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(value?: string | null): string {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, seconds] of steps) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return '–';
}
