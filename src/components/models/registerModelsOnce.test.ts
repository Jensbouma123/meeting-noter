import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerModelsOnce, resetModelRegistrationForTests } from './registerModelsOnce';

const m = vi.hoisted(() => ({
  detectAsrBackend: vi.fn(async () => 'webgpu' as const),
  initRegistry: vi.fn(),
  registerDefaultModels: vi.fn(),
  autoResumeConsentedDownloads: vi.fn(),
  registerDiarizationModel: vi.fn(),
  fetchSpeakerEmbedderIfModelCached: vi.fn(),
  registerLangIdModel: vi.fn(),
  registerSearchModel: vi.fn(),
}));

vi.mock('@/lib/asr/browser', () => ({
  detectAsrBackend: m.detectAsrBackend,
  initRegistry: m.initRegistry,
  registerDefaultModels: m.registerDefaultModels,
  autoResumeConsentedDownloads: m.autoResumeConsentedDownloads,
}));
vi.mock('@/lib/meeting/diarization-registry', () => ({ registerDiarizationModel: m.registerDiarizationModel }));
vi.mock('@/lib/meeting/diarization-embedder-fetch', () => ({
  fetchSpeakerEmbedderIfModelCached: m.fetchSpeakerEmbedderIfModelCached,
}));
vi.mock('@/lib/meeting/langid-registry', () => ({ registerLangIdModel: m.registerLangIdModel }));
vi.mock('@/lib/semantic-search/model-registry', () => ({ registerSearchModel: m.registerSearchModel }));

beforeEach(() => {
  resetModelRegistrationForTests();
  for (const fn of Object.values(m)) fn.mockClear();
});

describe('registerModelsOnce', () => {
  it('registers speech, speaker detection, language ID and search for the detected backend', async () => {
    await registerModelsOnce();
    expect(m.registerDefaultModels).toHaveBeenCalledWith('webgpu');
    expect(m.registerDiarizationModel).toHaveBeenCalledWith('webgpu');
    expect(m.registerLangIdModel).toHaveBeenCalledWith('webgpu');
    expect(m.registerSearchModel).toHaveBeenCalledOnce();
    expect(m.fetchSpeakerEmbedderIfModelCached).toHaveBeenCalledOnce();
  });

  it('runs once per page load when the app host and the meeting page both ask', async () => {
    await Promise.all([registerModelsOnce(), registerModelsOnce()]);
    await registerModelsOnce();
    expect(m.detectAsrBackend).toHaveBeenCalledOnce();
    expect(m.initRegistry).toHaveBeenCalledOnce();
    expect(m.autoResumeConsentedDownloads).toHaveBeenCalledOnce();
  });

  it('tries again after a failed registration', async () => {
    m.detectAsrBackend.mockRejectedValueOnce(new Error('no gpu probe'));
    await expect(registerModelsOnce()).rejects.toThrow('no gpu probe');
    await registerModelsOnce();
    expect(m.registerDefaultModels).toHaveBeenCalledOnce();
  });
});
