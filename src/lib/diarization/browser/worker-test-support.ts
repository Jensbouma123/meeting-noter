import { vi } from 'vitest';
import type { CoreSnapshotStub, FakeCoreRecord, PostedMessage } from './worker-test-support.types';

export const posted: PostedMessage[] = [];
export const cores: FakeCoreRecord[] = [];

export const loadState = {
  failLoad: true,
  backend: 'wasm' as 'webgpu' | 'wasm',
  releaseLoad: () => {},
  coreSnapshot: {
    numFrames: 0,
    compressed: false,
    embeds: new Float32Array(0),
    probs: new Float32Array(0),
  } as CoreSnapshotStub,
};

export const downloaderMock = {
  assertDiarizationModelsCached: async () => {
    if (loadState.failLoad) throw new Error('not downloaded');
  },
  downloadDiarizationModels: async () => ({}),
  modelSource: () => new Uint8Array(),
  revokeModelUrls: () => {},
};

export const sortformerModelMock = {
  SortformerModel: class {
    backend: string | null = null;
    async load() {
      await new Promise<void>((resolve) => {
        loadState.releaseLoad = resolve;
      });
      this.backend = loadState.backend;
    }
    dispose() {}
    run() {}
  },
};

export const coreMock = {
  DiarizerCore: class {
    readonly pushed: Array<number | undefined> = [];
    constructor(readonly options: never) {
      cores.push(this as never);
    }
    onSpeakerTurn() {}
    push(_chunk: Float32Array, startSample?: number) {
      this.pushed.push(startSample);
    }
    async flush() {}
    snapshotSpeakers() {
      return loadState.coreSnapshot;
    }
    dispose() {}
  },
};

export const flush = () => new Promise((r) => setTimeout(r, 0));

export async function loadWorker() {
  const ctx = { postMessage: (m: never) => posted.push(m), onmessage: null as never };
  vi.stubGlobal('self', ctx);
  await import('./worker');
  return (m: unknown) => (ctx.onmessage as (e: unknown) => void)({ data: m });
}
