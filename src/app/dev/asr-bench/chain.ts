/**
 * Chaining for `/dev/asr-bench`: which variant a run is, and where the next one
 * is.
 *
 * safaridriver cannot open a session on this Mac, so the chain is driven from
 * inside the tab: `?next=q4f16` makes a finished run reload the same tab onto
 * the next variant, which means a full page load (fresh GPU process) between
 * variants — the point of the chain is that no two variants share a process.
 *
 * Pure and import-free so `chain.test.ts` can cover it without pulling in the
 * engine (`parakeet` -> onnxruntime-web) that the page itself imports. The
 * price of that is the one thing this module cannot look up for itself: which
 * encoder the app defaults to. It is passed in (`defaultEncoder`), so the
 * default is stated once — in `model-manifest.ts` — instead of being guessed
 * here.
 */

import type { AsrBackend } from '@/lib/asr/browser';

/**
 * Order a chained run walks. The first entry is the app's WebGPU default
 * (`model-manifest.ts`'s `PARAKEET_TDT_V3_WEBGPU`), so the chain walks the real
 * defaults rather than a bench-only set; `int8` is last, so it carries no
 * `next`.
 */
export const CHAIN = ['q4f16', 'fp16', 'int8'] as const;
export type ChainKey = (typeof CHAIN)[number];

/**
 * Chain position -> manifest params, accepting the bare name (`fp16`), the §3
 * variant id (`webgpu-fp16`) and the WASM one (`wasm-int8`).
 *
 * `encoder` is the `?encoder=` override the page has to apply, which is
 * `null` for the default (nothing to override) and the name for any other
 * rung — the bench must ask for the *default* the app would actually use, not
 * the encoder the app happened to default to when this file was written.
 */
export function chainPosition(
  name: string,
  defaultEncoder: string,
): { key: ChainKey; backend: AsrBackend; encoder: string | null } | null {
  const key = name.trim().toLowerCase().replace(/^webgpu-/, '').replace(/^wasm-/, '');
  if (key === 'q4f16') return { key: 'q4f16', backend: 'webgpu', encoder: defaultEncoder === 'q4f16' ? null : 'q4f16' };
  if (key === 'fp16') return { key: 'fp16', backend: 'webgpu', encoder: defaultEncoder === 'fp16' ? null : 'fp16' };
  if (key === 'int8') return { key: 'int8', backend: 'wasm', encoder: null };
  return null;
}

/**
 * The quantisation an encoder *file* is, read off the filename.
 *
 * This exists because `manifest.encoderQuant` cannot be trusted for a run that
 * swapped the file: `/dev/asr-bench?encoder=q4f16` replaced the manifest's file
 * and left its `encoderQuant` alone, so a run of `encoder-model.q4f16.onnx`
 * posted `encoderQuant: "fp16"` and could be filed as `webgpu-fp16` — the §3
 * table then compared the same file against itself and reported two rows for
 * one encoder. The filename is the thing that was actually fetched, so it is
 * the thing a label is derived from.
 *
 * Returns `null` for a file that is not a recognised encoder graph, so a
 * caller can fall back to the manifest's own claim rather than inventing one.
 */
export function encoderQuantForFile(file: string | null | undefined): string | null {
  const match = /encoder-model\.(fp32|fp16|q4f16|int8|int4)\.onnx$/.exec(file ?? '');
  return match ? match[1] : null;
}

/**
 * Variant id for a *finished* run: the backend plus the quantisation of the
 * encoder file that was actually loaded.
 */
export function variantForEncoderFile(
  backend: AsrBackend | 'auto',
  encoderFile: string | null | undefined,
): string {
  if (backend === 'auto') return 'auto';
  const quant = encoderQuantForFile(encoderFile);
  return quant ? `${backend}-${quant}` : backend;
}

/**
 * Variant id for a run that produced no result — what the URL asked for, which
 * is what makes the "no file was posted" case attributable.
 */
export function requestedVariant(
  backend: AsrBackend | 'auto',
  encoder: string | null,
  defaultEncoder: string,
): string {
  if (backend === 'auto') return 'auto';
  const pos = chainPosition(encoder ?? (backend === 'wasm' ? 'int8' : defaultEncoder), defaultEncoder);
  return pos ? `${pos.backend}-${pos.key}` : backend;
}

/** `URLSearchParams` escapes `/` as `%2F`; in a query value that is just noise. */
const readable = (url: URL) => url.toString().replace(/%2F/g, '/');

/**
 * Where the chain goes next: an explicit URL/path verbatim, or a chain position
 * expanded against the current URL (keeping `file`, `runs`, …) and pointing at
 * the position *after* it — so one opened URL chains all three variants. `null`
 * means this was the last run.
 */
export function nextHref(next: string, here: string, defaultEncoder: string): string | null {
  const raw = next.trim();
  if (raw === '') return null;
  if (raw.startsWith('/') || /^https?:\/\//i.test(raw)) return raw;
  const pos = chainPosition(raw, defaultEncoder);
  if (!pos) return null;
  const url = new URL(here);
  url.searchParams.set('backend', pos.backend);
  if (pos.encoder) url.searchParams.set('encoder', pos.encoder);
  else url.searchParams.delete('encoder');
  url.searchParams.set('autostart', '1');
  const after = CHAIN[CHAIN.indexOf(pos.key) + 1];
  if (after) url.searchParams.set('next', after);
  else url.searchParams.delete('next');
  return readable(url);
}
