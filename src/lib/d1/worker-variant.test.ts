import { describe, expect, it } from 'vitest';
import { D1_GRAPH_FILE, D1_GRAPH_Q4_FILE, D1_WEIGHTS_FILE, D1_WEIGHTS_Q4_FILE, d1VariantFiles } from './manifest';
import type { D1WorkerOutMessage } from './protocol';
import { createD1WorkerHandler } from './worker';

const SPECIAL: Record<string, number> = {
  '<|pad|>': 0,
  '<|startoftext|>': 1,
  '<|mask|>': 50,
  '<|reserved_7|>': 51,
  '<|reserved_8|>': 52,
  '<|reserved_9|>': 53,
  '<|reserved_10|>': 54,
  '<|reserved_11|>': 55,
};
const tokenizer = {
  bos_token_id: 1,
  pad_token_id: 0,
  convert_tokens_to_ids: (tok: string) => SPECIAL[tok],
  encode: (text: string) => (text in SPECIAL ? [SPECIAL[text]] : [120, 121]),
} as never;

function setup(webgpu: boolean, failBackends: string[]) {
  const out: D1WorkerOutMessage[] = [];
  const downloads: string[] = [];
  const sessions: Array<{ backend?: string; model: unknown }> = [];
  const handle = createD1WorkerHandler((m) => out.push(m), {
    assertCached: async () => {},
    detectWebGpu: async () => webgpu,
    downloadModels: async (variant) => {
      downloads.push(variant);
      return Object.fromEntries(d1VariantFiles(variant).map((f) => [f.filename, `blob:${f.filename}`]));
    },
    readJson: async <T>() => ({ bos_token_id: 1, pad_token_id: 0 } as T),
    getModelSource: (u) => u,
    revokeUrls: () => {},
    createTokenizer: () => tokenizer,
    createOrtSession: async (model, _ext, backend) => {
      sessions.push({ backend, model });
      if (failBackends.includes(backend ?? 'wasm')) throw new Error(`${backend} cannot run this graph`);
      return { session: { release: async () => {} } as never, backend: backend ?? 'wasm' };
    },
  });
  return { out, downloads, sessions, handle };
}

describe('D1 model variant per backend', () => {
  it('WebGPU loads the 4-bit graph and weights', async () => {
    const t = setup(true, []);
    await t.handle({ type: 'init', id: 'a' }).catch(() => {});
    expect(t.downloads).toEqual(['q4']);
    expect(t.sessions).toEqual([{ backend: 'webgpu', model: `blob:${D1_GRAPH_Q4_FILE.filename}` }]);
    expect(D1_WEIGHTS_Q4_FILE.sizeBytes).toBeLessThan(D1_WEIGHTS_FILE.sizeBytes);
  });

  it('without WebGPU it never touches the 4-bit files', async () => {
    const t = setup(false, []);
    await t.handle({ type: 'init', id: 'a' }).catch(() => {});
    expect(t.downloads).toEqual(['int8']);
    expect(t.sessions).toEqual([{ backend: 'wasm', model: `blob:${D1_GRAPH_FILE.filename}` }]);
  });

  it('a WebGPU session failure falls back to WASM with the 8-bit files', async () => {
    const t = setup(true, ['webgpu']);
    await t.handle({ type: 'init', id: 'a' }).catch(() => {});
    expect(t.downloads).toEqual(['q4', 'int8']);
    expect(t.sessions.map((s) => s.backend)).toEqual(['webgpu', 'wasm']);
    expect(t.out.find((m) => m.type === 'ready')).toMatchObject({ backend: 'wasm' });
  });
});
