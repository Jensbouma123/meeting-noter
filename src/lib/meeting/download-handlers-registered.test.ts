import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/diarization/browser/downloader', () => ({ ensureDiarizationModelsCached: vi.fn() }));

describe('download handlers', () => {
  it('are registered on module load, before any registerModel call', async () => {
    const state = await import('@/lib/asr/browser/browser-asr-download-state');
    expect(state.downloadHandlers.has('langid')).toBe(false);
    await import('./langid-registry');
    await import('./diarization-registry');
    expect(state.downloadHandlers.has('langid')).toBe(true);
    expect(state.downloadHandlers.has('diarization')).toBe(true);
  });
});
