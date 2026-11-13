import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ASR_MODEL_FAMILY,
  getAsrModelFamily,
  resetAsrModelFamilyForTests,
  setAsrModelFamily,
  subscribeAsrModelFamily,
} from './model-family';
import { activeAsrManifest, forceNextWebgpuEncoder, resetAsrBackendDetectionForTests } from './backend-detect';
import {
  NEMOTRON_ASR_WASM,
  NEMOTRON_ASR_WEBGPU,
  PARAKEET_TDT_V3_WASM,
  PARAKEET_TDT_V3_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU_FP16,
  manifestForVariant,
} from './model-manifest';
import { categorizeManifestFile } from './resumable-download';
import { configFromManifest } from './config-from-manifest';

/**
 * Parakeet stays selectable next to Nemotron: the family is one stored
 * choice, and every manifest decision (`activeAsrManifest`, the WebGPU
 * fallback walk, the download manager's lookup) reads it.
 */

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

beforeEach(() => {
  resetAsrModelFamilyForTests();
  resetAsrBackendDetectionForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the model family', () => {
  it('defaults when nothing is stored, and persists a choice', () => {
    const store = stubStorage();
    expect(getAsrModelFamily()).toBe(DEFAULT_ASR_MODEL_FAMILY);
    const other = DEFAULT_ASR_MODEL_FAMILY === 'parakeet' ? 'nemotron' : 'parakeet';
    const heard = vi.fn();
    subscribeAsrModelFamily(heard);
    setAsrModelFamily(other);
    expect(getAsrModelFamily()).toBe(other);
    expect(store.get('meeting-noter:asr-model-family')).toBe(other);
    expect(heard).toHaveBeenCalledTimes(1);
    setAsrModelFamily(other);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('reads a stored choice, and ignores garbage', () => {
    stubStorage({ 'meeting-noter:asr-model-family': 'nemotron' });
    expect(getAsrModelFamily()).toBe('nemotron');
    resetAsrModelFamilyForTests();
    stubStorage({ 'meeting-noter:asr-model-family': 'whisper' });
    expect(getAsrModelFamily()).toBe(DEFAULT_ASR_MODEL_FAMILY);
  });
});

describe('manifest selection by family', () => {
  it('resolves Parakeet variants for Parakeet, Nemotron variants for Nemotron', () => {
    stubStorage({ 'meeting-noter:asr-model-family': 'parakeet' });
    expect(activeAsrManifest('webgpu')).toBe(PARAKEET_TDT_V3_WEBGPU);
    expect(activeAsrManifest('wasm')).toBe(PARAKEET_TDT_V3_WASM);
    setAsrModelFamily('nemotron');
    expect(activeAsrManifest('webgpu')).toBe(NEMOTRON_ASR_WEBGPU);
    expect(activeAsrManifest('wasm')).toBe(NEMOTRON_ASR_WASM);
  });

  it('walks the encoder ladder for Parakeet only; Nemotron goes straight to WASM', () => {
    stubStorage({ 'meeting-noter:asr-model-family': 'parakeet' });
    expect(forceNextWebgpuEncoder('q4f16')).toBe(PARAKEET_TDT_V3_WEBGPU_FP16);
    resetAsrBackendDetectionForTests();
    setAsrModelFamily('nemotron');
    expect(forceNextWebgpuEncoder('q4f16')).toBeNull();
    expect(activeAsrManifest('webgpu')).toBe(NEMOTRON_ASR_WEBGPU);
  });

  it('finds a registry entry’s manifest by its variant', () => {
    expect(manifestForVariant('nemotron-wasm-int4')).toBe(NEMOTRON_ASR_WASM);
    expect(manifestForVariant('webgpu-fp16')).toBe(PARAKEET_TDT_V3_WEBGPU_FP16);
    expect(manifestForVariant(undefined)).toBeNull();
  });

  it('carries the engine onto the config the worker builds from', () => {
    expect(configFromManifest(NEMOTRON_ASR_WEBGPU).engine).toBe('nemotron');
    expect(configFromManifest(PARAKEET_TDT_V3_WASM).engine).toBe('parakeet');
  });
});

describe('Nemotron manifests', () => {
  it('share one file set, so switching backend never downloads twice', () => {
    expect(NEMOTRON_ASR_WASM.files).toEqual(NEMOTRON_ASR_WEBGPU.files);
    expect(NEMOTRON_ASR_WASM.modelRepo).toBe(NEMOTRON_ASR_WEBGPU.modelRepo);
  });

  it('sum their declared sizes', () => {
    const total = NEMOTRON_ASR_WEBGPU.files.reduce((sum, f) => sum + NEMOTRON_ASR_WEBGPU.fileSizes[f], 0);
    expect(total).toBe(NEMOTRON_ASR_WEBGPU.fallbackSizeBytes);
    expect(total).toBe(790_454_260);
  });

  it('classify every file, so none is downloaded for nothing', () => {
    expect(NEMOTRON_ASR_WEBGPU.files.map(categorizeManifestFile)).toEqual([
      'encoder',
      'encoderData',
      'decoder',
      'decoderData',
      'joint',
      'jointData',
      'tokenizer',
    ]);
    // Parakeet's names are untouched.
    expect(categorizeManifestFile('decoder_joint-model.int8.onnx')).toBe('decoder');
    expect(categorizeManifestFile('encoder-model.q4f16.onnx')).toBe('encoder');
  });
});
