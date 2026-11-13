import type { EG2Device } from './types';

export function defaultDevice(): EG2Device {
  if (typeof navigator === 'undefined') return 'cpu';
  return 'gpu' in navigator ? 'webgpu' : 'wasm';
}
