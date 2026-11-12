import path from 'node:path';

/** Directory the bench JSON lands in: `test-audio/bench-results` next to the repo. */
export function benchResultsDir(): string {
  const override = process.env.ASR_BENCH_RESULT_DIR;
  if (override) return override;
  return path.join(process.cwd(), '..', 'test-audio', 'bench-results');
}

/** Filesystem-safe, lowercase, bounded: everything but `[a-z0-9._-]` becomes `-`. */
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

/**
 * Browser name for the filename. Chrome's UA also says `Safari`, so the
 * Chromium tokens have to be tested first or every run lands as `safari`.
 */
export function browserFromUserAgent(userAgent: unknown): string {
  const ua = String(userAgent ?? '');
  if (/Edg(?:e|A|iOS)?\//.test(ua)) return 'edge';
  if (/OPR\/|Opera|OPiOS\//.test(ua)) return 'opera';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'unknown';
}

/**
 * `webgpu-fp16` / `webgpu-q4f16` / `wasm-int8` — the same variant ids
 * `scripts/asr-bench-safari.mjs` uses, so §3 of the results doc is comparable.
 * Falls back to `backend`-`encoderQuant` when the page did not send a variant.
 */
export function variantFromPayload(payload: Record<string, unknown>): string {
  const explicit = String(payload.variant ?? '').trim();
  if (explicit) return explicit;
  const backend = String(payload.backend ?? 'unknown').trim() || 'unknown';
  const encoder = String(payload.encoderQuant ?? payload.encoder ?? '').trim();
  return encoder ? `${backend}-${encoder}` : backend;
}

/** ISO-8601 with `:`/`.` swapped for `-`: sortable, and legal in a filename. */
export function fileTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** `<variant>-<browser>-<timestamp>.json`. */
export function resultFileName(payload: Record<string, unknown>, date = new Date()): string {
  const variant = slug(variantFromPayload(payload));
  const browser = slug(browserFromUserAgent(payload.userAgent), 'unknown');
  return `${variant}-${browser}-${fileTimestamp(date)}.json`;
}

/**
 * `…-2.json` for the second run inside the same millisecond. Two POSTs can
 * easily share a timestamp, and the point of one file per run is that a retried
 * run adds evidence instead of overwriting it.
 */
export function disambiguate(name: string, nth: number): string {
  const ext = path.extname(name);
  return `${name.slice(0, name.length - ext.length)}-${nth}${ext}`;
}
