import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consentedAndCached,
  fakes,
  modules,
  resetBridge,
  resetFakesAndRegistry
} from './diarization-bridge-fakes';

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./diarization-bridge-fakes')).mockAsrBrowser(importOriginal));

vi.mock('@/lib/diarization/browser', async () =>
  (await import('./diarization-bridge-fakes')).mockDiarizationBrowser());

beforeEach(resetFakesAndRegistry);

afterEach(resetBridge);

const PYANNOTE_ERA_REPO =
  'csukuangfj/sherpa-onnx-pyannote-segmentation-3-0+hbredin/wespeaker-voxceleb-resnet34-LM';

describe('diarization bridge — registry identity', () => {
  it('drops a "cached" entry left by the pyannote-era model, so the Nemotron files get downloaded', async () => {
    const { registry, bridge } = await modules();
    registry.registerModel({
      key: bridge.DIARIZATION_REGISTRY_KEY,
      modelRepo: PYANNOTE_ERA_REPO,
      displayName: 'Speaker detection',
      estimatedSizeBytes: 32_000_000,
      backend: 'webgpu',
      kind: 'diarization',
    });
    registry.markCached(bridge.DIARIZATION_REGISTRY_KEY);

    bridge.registerDiarizationModel('webgpu');

    const entry = registry.getModelStatus(bridge.DIARIZATION_REGISTRY_KEY)!;
    expect(entry.modelRepo).toBe(bridge.DIARIZATION_REGISTRY_IDENTITY);
    expect(entry.modelRepo).toContain('onnx-community/Nemotron-3-Diarization-ONNX');
    expect(entry.modelRepo).toContain('onnx/model_q4f16.onnx_data');
    expect(entry.status).toBe('not-downloaded');
  });
});

describe('diarization bridge — status', () => {
  it('says why there are no speakers when the model was never consented to', async () => {
    const { bridge, store } = await modules();
    bridge.registerDiarizationModel('webgpu');
    bridge.startDiarization(['mic']);
    expect(fakes.created).toEqual([]);
    expect(store.getState().diarization).toMatchObject({ phase: 'unavailable' });
    expect(store.getState().diarization?.reason).toMatch(/not downloaded/i);
  });

  it('goes loading → active (with the backend) → off', async () => {
    const { bridge, store } = await consentedAndCached();
    bridge.startDiarization(['mic']);
    expect(fakes.created).toEqual(['mic']);
    expect(store.getState().diarization?.phase).toBe('loading');

    fakes.ready.get('mic')!({ backend: 'webgpu' });
    expect(store.getState().diarization).toEqual({ phase: 'active', reason: null, backend: 'webgpu' });

    bridge.stopDiarization();
    expect(store.getState().diarization?.phase).toBe('off');
  });

  it('waits for a consented download still in progress and starts when it lands', async () => {
    const { registry, bridge, store } = await modules();
    bridge.registerDiarizationModel('webgpu');
    registry.recordConsent('accepted', [bridge.DIARIZATION_REGISTRY_KEY]);
    (await import('@/lib/asr/browser/model-registry-status')).markDownloading(bridge.DIARIZATION_REGISTRY_KEY, 1);

    bridge.startDiarization(['mic']);
    expect(fakes.created).toEqual([]);
    expect(store.getState().diarization?.phase).toBe('waiting');

    registry.markCached(bridge.DIARIZATION_REGISTRY_KEY);
    expect(fakes.created).toEqual(['mic']);
    expect(store.getState().diarization?.phase).toBe('loading');
  });

  it('re-downloads through the registry when the worker finds the files missing, then restarts', async () => {
    const { registry, bridge, store } = await consentedAndCached();
    bridge.startDiarization(['mic', 'system']);
    fakes.error.get('mic')!('Speaker detection model is not downloaded (onnx/model_q4f16.onnx)', 'not-cached');
    fakes.error.get('system')!('Speaker detection model is not downloaded (onnx/model_q4f16.onnx)', 'not-cached');

    expect(fakes.disposed.sort()).toEqual(['mic', 'system']);
    expect(fakes.retried).toEqual([bridge.DIARIZATION_REGISTRY_KEY]);
    expect(registry.getModelStatus(bridge.DIARIZATION_REGISTRY_KEY)!.status).toBe('not-downloaded');
    expect(store.getState().diarization?.phase).toBe('waiting');
    expect(store.getState().warning).toBeNull();

    registry.markCached(bridge.DIARIZATION_REGISTRY_KEY);
    expect(fakes.created.sort()).toEqual(['mic', 'mic', 'system', 'system']);
  });

  it('reports any other worker failure as unavailable, with the reason', async () => {
    const { bridge, store } = await consentedAndCached();
    bridge.startDiarization(['mic']);
    fakes.error.get('mic')!('WebGPU device lost', 'failed');
    expect(store.getState().diarization).toEqual({ phase: 'unavailable', reason: 'WebGPU device lost' });
    expect(fakes.retried).toEqual([]);
  });
});

