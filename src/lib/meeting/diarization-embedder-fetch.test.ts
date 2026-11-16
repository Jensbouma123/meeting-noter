import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consentedAndCached, modules, resetBridge, resetFakesAndRegistry } from './diarization-bridge-fakes';

const dl = vi.hoisted(() => ({
  embedderCached: false,
  ensureEmbedder: vi.fn(async () => {}),
}));

vi.mock('@/lib/diarization/browser/downloader', () => ({
  ensureDiarizationModelsCached: vi.fn(async () => {}),
  ensureSpeakerEmbedderCached: dl.ensureEmbedder,
  isEmbedderCached: async () => dl.embedderCached,
}));

vi.mock('@/lib/diarization/browser', async () =>
  (await import('./diarization-bridge-fakes')).mockDiarizationBrowser());

beforeEach(async () => {
  dl.embedderCached = false;
  dl.ensureEmbedder.mockReset();
  dl.ensureEmbedder.mockResolvedValue(undefined);
  await resetFakesAndRegistry();
});

afterEach(resetBridge);

describe('best-effort speaker embedder fetch', () => {
  it('leaves diarization cached and logs a warning when the embedder fetch fails', async () => {
    const { registry, bridge } = await consentedAndCached();
    const { fetchSpeakerEmbedderIfModelCached, fetchSpeakerEmbedderBestEffort } = await import('./diarization-embedder-fetch');
    dl.ensureEmbedder.mockRejectedValue(new Error('network'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchSpeakerEmbedderIfModelCached();
    await fetchSpeakerEmbedderBestEffort();
    expect(dl.ensureEmbedder).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(registry.getModelStatus(bridge.DIARIZATION_REGISTRY_KEY)?.status).toBe('cached');
    warn.mockRestore();
  });

  it('fetches only the embedder for a cached install, and retries after a failure', async () => {
    await consentedAndCached();
    const { fetchSpeakerEmbedderIfModelCached, fetchSpeakerEmbedderBestEffort } = await import('./diarization-embedder-fetch');
    fetchSpeakerEmbedderIfModelCached();
    await fetchSpeakerEmbedderBestEffort();
    expect(dl.ensureEmbedder).toHaveBeenCalledTimes(1);
    await fetchSpeakerEmbedderBestEffort();
    expect(dl.ensureEmbedder).toHaveBeenCalledTimes(2);
  });

  it('skips the fetch when the embedder is already cached', async () => {
    await consentedAndCached();
    dl.embedderCached = true;
    const { fetchSpeakerEmbedderBestEffort } = await import('./diarization-embedder-fetch');
    await fetchSpeakerEmbedderBestEffort();
    expect(dl.ensureEmbedder).not.toHaveBeenCalled();
  });

  it('does not fetch without consent', async () => {
    const { bridge } = await modules();
    bridge.registerDiarizationModel('webgpu');
    const { fetchSpeakerEmbedderBestEffort, fetchSpeakerEmbedderIfModelCached } = await import('./diarization-embedder-fetch');
    fetchSpeakerEmbedderIfModelCached();
    await fetchSpeakerEmbedderBestEffort();
    expect(dl.ensureEmbedder).not.toHaveBeenCalled();
  });
});
