import type { AsrBackend } from '@/lib/asr/browser';
import { CHAIN } from './constants';
import type { ChainPosition } from './types';

export function chainPosition(name: string, defaultEncoder: string): ChainPosition | null {
  const key = name.trim().toLowerCase().replace(/^webgpu-/, '').replace(/^wasm-/, '');
  if (key === 'q4f16') return { key: 'q4f16', backend: 'webgpu', encoder: defaultEncoder === 'q4f16' ? null : 'q4f16' };
  if (key === 'fp16') return { key: 'fp16', backend: 'webgpu', encoder: defaultEncoder === 'fp16' ? null : 'fp16' };
  if (key === 'int8') return { key: 'int8', backend: 'wasm', encoder: null };
  return null;
}

export function encoderQuantForFile(file: string | null | undefined): string | null {
  const match = /encoder-model\.(fp32|fp16|q4f16|int8|int4)\.onnx$/.exec(file ?? '');
  return match ? match[1] : null;
}

export function variantForEncoderFile(
  backend: AsrBackend | 'auto',
  encoderFile: string | null | undefined,
): string {
  if (backend === 'auto') return 'auto';
  const quant = encoderQuantForFile(encoderFile);
  return quant ? `${backend}-${quant}` : backend;
}

export function requestedVariant(
  backend: AsrBackend | 'auto',
  encoder: string | null,
  defaultEncoder: string,
): string {
  if (backend === 'auto') return 'auto';
  const pos = chainPosition(encoder ?? (backend === 'wasm' ? 'int8' : defaultEncoder), defaultEncoder);
  return pos ? `${pos.backend}-${pos.key}` : backend;
}

const withoutEscapedSlashes = (url: URL) => url.toString().replace(/%2F/g, '/');

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
  return withoutEscapedSlashes(url);
}
