import type { WasmEnv } from './types';

export const ORT_WASM_BASE = '/ort/web/';
export const TRANSFORMERS_ORT_WASM_BASE = '/ort/transformers/';

export function applyOrtWasmPaths(env: WasmEnv, base: string = ORT_WASM_BASE): void {
  if (env.wasm) env.wasm.wasmPaths = base;
}
