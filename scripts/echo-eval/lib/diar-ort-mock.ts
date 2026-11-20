import type { WasmEnv } from '@/lib/ort-paths/types';
import { ORT_NODE_WASM_BASE } from './diar-paths';

export const nodeOrtPaths = () => ({
  ORT_WASM_BASE: ORT_NODE_WASM_BASE,
  TRANSFORMERS_ORT_WASM_BASE: ORT_NODE_WASM_BASE,
  applyOrtWasmPaths(env: WasmEnv): void {
    if (env.wasm) env.wasm.wasmPaths = ORT_NODE_WASM_BASE;
  },
});
