import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensured: [] as string[],
  bytesCalls: 0,
  cached: new Set<string>(),
}));

vi.mock('../../asr/browser/resumable-download', () => ({
  ensureHfFileCached: async (repo: string, file: string) => {
    mocks.ensured.push(`${repo}:${file}`);
  },
  downloadHfFileResumable: async () => {
    mocks.bytesCalls += 1;
    return 'blob:x';
  },
  takeBlobUrlBytes: () => null,
  areModelFilesCached: async (m: { files: string[] }) => ({
    complete: m.files.every((f) => mocks.cached.has(f)),
  }),
}));

import {
  assertDiarizationModelsCached,
  ensureDiarizationModelsCached,
  ensureSpeakerEmbedderCached,
  isEmbedderCached,
} from './downloader';
import { DIARIZATION_MODELS, SORTFORMER_WEIGHTS, SPEAKER_EMBEDDER } from './manifest';

beforeEach(() => {
  mocks.ensured.length = 0;
  mocks.bytesCalls = 0;
  mocks.cached.clear();
});

describe('diarization downloader', () => {
  it('warms the cache without building Blobs (F3)', async () => {
    await ensureDiarizationModelsCached();
    expect(mocks.ensured).toEqual([
      `${SORTFORMER_WEIGHTS.repo}:onnx/model_q4f16.onnx`,
      `${SORTFORMER_WEIGHTS.repo}:onnx/model_q4f16.onnx_data`,
    ]);
    expect(mocks.bytesCalls).toBe(0);
  });

  it('fetches the embedder separately', async () => {
    await ensureSpeakerEmbedderCached();
    expect(mocks.ensured).toEqual([
      'csukuangfj/speaker-embedding-models:wespeaker_en_voxceleb_resnet34.onnx',
    ]);
  });

  it('does not need the embedder to start Sortformer', async () => {
    for (const f of DIARIZATION_MODELS) mocks.cached.add(f.filename);
    await expect(assertDiarizationModelsCached()).resolves.toBeUndefined();
  });

  it('reports whether the speaker embedder is cached', async () => {
    expect(await isEmbedderCached()).toBe(false);
    mocks.cached.add(SPEAKER_EMBEDDER.filename);
    expect(await isEmbedderCached()).toBe(true);
  });

  it('fails instead of downloading when a file is not cached (F1)', async () => {
    mocks.cached.add(DIARIZATION_MODELS[0].filename);
    await expect(assertDiarizationModelsCached()).rejects.toThrow(/not downloaded/);
    for (const f of DIARIZATION_MODELS) mocks.cached.add(f.filename);
    await expect(assertDiarizationModelsCached()).resolves.toBeUndefined();
  });
});
