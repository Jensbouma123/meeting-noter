import { describe, expect, it, vi } from 'vitest';
import { DIARIZATION_TOTAL_SIZE_BYTES, SPEAKER_EMBEDDER } from '@/lib/diarization/browser/manifest';

const m = vi.hoisted(() => ({
  handlers: new Map<string, (onProgress: (p: unknown) => void) => Promise<void>>(),
  registered: [] as { estimatedSizeBytes: number }[],
  embedderCached: false,
  ensureDiarizationModelsCached: vi.fn(async (cb: (file: unknown, p: unknown) => void) => cb({}, 'sortformer')),
  ensureSpeakerEmbedderCached: vi.fn(async (cb: (p: unknown) => void) => cb('embedder')),
}));

vi.mock('@/lib/asr/browser', () => ({
  registerDownloadHandler: (kind: string, fn: (onProgress: (p: unknown) => void) => Promise<void>) =>
    m.handlers.set(kind, fn),
  registerModel: (config: { estimatedSizeBytes: number }) => m.registered.push(config),
  isConsentGiven: () => true,
  getModelStatus: () => undefined,
}));
vi.mock('@/lib/diarization/browser/downloader', () => ({
  ensureDiarizationModelsCached: m.ensureDiarizationModelsCached,
  ensureSpeakerEmbedderCached: m.ensureSpeakerEmbedderCached,
  isEmbedderCached: async () => m.embedderCached,
}));

describe('speaker detection download', () => {
  it('fetches the speaker embedder inside the same download, with progress', async () => {
    await import('./diarization-registry');
    const progress: unknown[] = [];
    await m.handlers.get('diarization')!((p) => progress.push(p));
    expect(m.ensureSpeakerEmbedderCached).toHaveBeenCalledOnce();
    expect(progress).toEqual(['sortformer', 'embedder']);
  });

  it('counts the embedder in the size shown before the download', async () => {
    const { registerDiarizationModel } = await import('./diarization-registry');
    registerDiarizationModel('webgpu');
    expect(m.registered.at(-1)?.estimatedSizeBytes).toBe(DIARIZATION_TOTAL_SIZE_BYTES + SPEAKER_EMBEDDER.sizeBytes);
  });
});
