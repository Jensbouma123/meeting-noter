import path from 'node:path';

export function benchResultsDir(): string {
  const override = process.env.ASR_BENCH_RESULT_DIR;
  if (override) return override;
  return path.join(process.cwd(), '..', 'test-audio', 'bench-results');
}

export function slug(value: unknown, fallback = 'unknown'): string {
  const cleaned = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 48);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function browserFromUserAgent(userAgent: unknown): string {
  const ua = String(userAgent ?? '');
  if (/Edg(?:e|A|iOS)?\//.test(ua)) return 'edge';
  if (/OPR\/|Opera|OPiOS\//.test(ua)) return 'opera';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'unknown';
}

export function variantFromPayload(payload: Record<string, unknown>): string {
  const explicit = String(payload.variant ?? '').trim();
  if (explicit) return explicit;
  const backend = String(payload.backend ?? 'unknown').trim() || 'unknown';
  const encoder = String(payload.encoderQuant ?? payload.encoder ?? '').trim();
  return encoder ? `${backend}-${encoder}` : backend;
}

export function fileTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function resultFileName(payload: Record<string, unknown>, date = new Date()): string {
  const variant = slug(variantFromPayload(payload));
  const browser = slug(browserFromUserAgent(payload.userAgent), 'unknown');
  return `${variant}-${browser}-${fileTimestamp(date)}.json`;
}

export function disambiguate(name: string, nth: number): string {
  const ext = path.extname(name);
  return `${name.slice(0, name.length - ext.length)}-${nth}${ext}`;
}
