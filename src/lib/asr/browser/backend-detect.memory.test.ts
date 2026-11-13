import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectAsrBackend,
  forceWasmBackend,
  resetAsrBackendDetectionForTests,
} from './backend-detect';

function stubDeviceMemory(value: unknown): void {
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    deviceMemory: value,
    gpu: {
      requestAdapter: async () => ({ isFallbackAdapter: false }),
    },
  });
}

function stubSafari(extra: Record<string, unknown> = {}): void {
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    vendor: 'Apple Computer, Inc.',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    deviceMemory: undefined,
    gpu: {
      requestAdapter: async () => ({ isFallbackAdapter: false }),
    },
    ...extra,
  });
}

function stubChrome(): void {
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    vendor: 'Google Inc.',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    deviceMemory: 8,
    gpu: {
      requestAdapter: async () => ({ isFallbackAdapter: false }),
    },
  });
}

beforeEach(() => {
  resetAsrBackendDetectionForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAsrBackendDetectionForTests();
});

describe('detectAsrBackend', () => {
  it('uses WebGPU when the device has plenty of RAM and a working adapter', async () => {
    stubDeviceMemory(8);
    expect(await detectAsrBackend()).toBe('webgpu');
  });

  it('takes the small CPU model on a device that reports too little RAM', async () => {
    stubDeviceMemory(2);

    expect(await detectAsrBackend()).toBe('wasm');
  });

  it('ignores an absent or nonsensical deviceMemory, exactly as Safari does', async () => {
    for (const value of [undefined, 0, -1, Number.NaN, 'lots']) {
      resetAsrBackendDetectionForTests();
      stubDeviceMemory(value);
      expect(await detectAsrBackend()).toBe('webgpu');
    }
  });

  it('still falls back to WASM with no adapter at all', async () => {
    vi.stubGlobal('navigator', { ...(globalThis.navigator as unknown as object) });
    expect(await detectAsrBackend()).toBe('wasm');
  });

  it('honours a runtime WebGPU failure over the memory guard', async () => {
    stubDeviceMemory(8);
    expect(await detectAsrBackend()).toBe('webgpu');
    forceWasmBackend();
    expect(await detectAsrBackend()).toBe('wasm');
  });

  it('routes Safari to WebGPU despite no deviceMemory report', async () => {
    stubSafari();
    expect(await detectAsrBackend()).toBe('webgpu');
  });

  it('routes Safari to WebGPU even if it reported plenty of RAM', async () => {
    stubSafari({ deviceMemory: 8 });
    expect(await detectAsrBackend()).toBe('webgpu');
  });

  it('keeps Chrome WebGPU on the fp16 path when memory permits', async () => {

    stubChrome();
    expect(await detectAsrBackend()).toBe('webgpu');
  });

  it('does not mistake Chrome-on-macOS for Safari', async () => {

    const { isSafariEngine } = await import('./is-safari-engine');
    stubChrome();
    expect(isSafariEngine()).toBe(false);
    stubSafari();
    expect(isSafariEngine()).toBe(true);
  });
});
