import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLocalStorage, KEY, loadRegistry } from './model-registry.test-support';

beforeEach(() => {
  vi.resetModules();
  installLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('recordConsent', () => {
  it('records the decision without touching dialog visibility', async () => {
    const registry = await loadRegistry();
    registry.openDialog();
    expect(registry.getState().dialogVisible).toBe(true);

    registry.recordConsent('accepted', [KEY]);

    expect(registry.isConsentGiven(KEY)).toBe(true);
    expect(registry.getState().dialogVisible).toBe(true);
  });

  it('leaves an automatic (null) visibility untouched rather than latching it to false', async () => {
    const registry = await loadRegistry();
    expect(registry.getState().dialogVisible).toBe(true);

    registry.recordConsent('accepted', [KEY]);

    expect(registry.getState().dialogVisible).toBe(true);
    registry.closeDialog();
  });

  it('still cancels an in-flight download when consent is withdrawn', async () => {
    const registry = await loadRegistry();
    registry.updateProgress(KEY, 1_000, 2_000, 'encoder-model.int8.onnx', 0, 0);
    registry.getModelStatus(KEY)!.status = 'downloading';

    registry.recordConsent('declined', []);

    expect(registry.getModelStatus(KEY)!.status).toBe('cancelled');
  });
});

describe('markNotCached', () => {
  it('takes back a cached claim that the storage no longer backs', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    expect(registry.getModelStatus(KEY)!.status).toBe('cached');

    registry.updateProgress(KEY, 900, 1_000, 'encoder-model.int8.onnx', 100, 1);
    registry.markNotCached(KEY, 'The browser cache no longer has these files.');

    const after = registry.getModelStatus(KEY)!;
    expect(after.status).toBe('not-downloaded');
    expect(after.isReady).toBe(false);
    expect(after.progress).toMatchObject({ loadedBytes: 0, percent: 0 });
    expect(after.error).toMatch(/no longer has these files/);
  });

  it('persists the change, so a reload does not resurrect the lie', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    registry.markNotCached(KEY);

    vi.resetModules();
    const reloaded = await import('./model-registry');
    reloaded.initRegistry();
    reloaded.registerModel({
      key: KEY,
      modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
      displayName: 'Parakeet TDT 0.6B v3 (CPU)',
      estimatedSizeBytes: 670_479_942,
      backend: 'wasm',
    });
    expect(reloaded.getModelStatus(KEY)!.status).not.toBe('cached');
  });
});

describe('resetAllEntries', () => {
  it('resets every entry including the cached ones', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    registry.registerModel({
      key: 'diarization',
      modelRepo: 'other/repo',
      displayName: 'Diarization',
      estimatedSizeBytes: 1_000,
      backend: 'wasm',
      kind: 'diarization',
    });
    registry.markCached('diarization');

    registry.resetAllEntries();

    for (const key of [KEY, 'diarization']) {
      const e = registry.getModelStatus(key)!;
      expect(e.status).toBe('not-downloaded');
      expect(e.isReady).toBe(false);
    }
  });

  it('leaves a model this browser cannot run marked unavailable', async () => {
    const registry = await loadRegistry();
    registry.markUnavailable(KEY);

    registry.resetAllEntries();

    expect(registry.getModelStatus(KEY)!.status).toBe('unavailable');
  });

  it('is different from resetConsent, which deliberately keeps cached entries', async () => {
    const registry = await loadRegistry();
    registry.markCached(KEY);
    registry.recordConsent('accepted', [KEY]);

    registry.resetConsent();
    expect(registry.getModelStatus(KEY)!.status).toBe('cached');
    expect(registry.isConsentGiven(KEY)).toBe(false);
  });
});

describe('copy-on-write entries', () => {
  it('changes the entries and entry identity on every mutation', async () => {
    const registry = await loadRegistry();
    const before = registry.getState().entries;
    const entryBefore = before[KEY];

    registry.markFailed(KEY, 'Download failed: 500');

    const after = registry.getState().entries;
    expect(after).not.toBe(before);
    expect(after[KEY]).not.toBe(entryBefore);
    expect(entryBefore.status).toBe('not-downloaded');
    expect(after[KEY].status).toBe('failed');
  });
});
