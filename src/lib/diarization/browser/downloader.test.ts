import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensured: [] as string[],
  bytesCalls: 0,
  cached: new Set<string>(),
}));

vi.mock('../../asr/browser/resumable-download', () => ({
  ensureHfFileCached: async (_repo: string, file: string) => {
    mocks.ensured.push(file);
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

import { assertDiarizationModelsCached, ensureDiarizationModelsCached } from './downloader';
import { DIARIZATION_MODELS } from './manifest';

beforeEach(() => {
  mocks.ensured.length = 0;
  mocks.bytesCalls = 0;
  mocks.cached.clear();
});

describe('diarization downloader', () => {
  it('warms the cache without building Blobs (F3)', async () => {
    await ensureDiarizationModelsCached();
    expect(mocks.ensured).toEqual(DIARIZATION_MODELS.map((f) => f.filename));
    expect(mocks.bytesCalls).toBe(0);
  });

  it('fails instead of downloading when a file is not cached (F1)', async () => {
    mocks.cached.add(DIARIZATION_MODELS[0].filename);
    await expect(assertDiarizationModelsCached()).rejects.toThrow(/not downloaded/);
    for (const f of DIARIZATION_MODELS) mocks.cached.add(f.filename);
    await expect(assertDiarizationModelsCached()).resolves.toBeUndefined();
  });
});
