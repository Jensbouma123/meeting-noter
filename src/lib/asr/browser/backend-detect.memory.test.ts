import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectAsrBackend,
  forceWasmBackend,
  resetAsrBackendDetectionForTests,
} from './backend-detect';

/**
 * The memory half of the tab-crash investigation.
 *
 * Safari shows up as "This webpage was reloaded because a problem occurred" —
 * a WebContent process being killed, which on a memory-bound tab means an
 * allocation that never completed. The big one used to be the WebGPU
 * manifest: fp32 encoder plus a 2.44 GB external-data blob, held twice
 * (browser copy + ORT session). That manifest is gone — WebGPU is the fp16
 * encoder (~1.24 GB, single file) now — so Safari takes WebGPU like everyone
 * else. What remains is the device-memory guard below: where a *non-Safari*
 * browser tells us how much RAM the device has, too little of it still
 * refuses the WebGPU manifest up front in favour of the ~670 MB int8/WASM
 * variant.
 */

function stubDeviceMemory(value: unknown): void {
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    deviceMemory: value,
    gpu: {
      requestAdapter: async () => ({ isFallbackAdapter: false }),
    },
  });
}

/**
 * Safari: Apple vendor, Safari UA, no `deviceMemory` (Safari does not
 * implement it), and — the point — a *working* WebGPU adapter. The routing
 * takes WebGPU: the fp16 encoder fits under Safari's per-tab cap, and a
 * runtime failure still falls back to WASM/int8 in `browser-asr.ts` behind
 * the crash-loop guard.
 */
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
    // The adapter is fine and `requestAdapter` succeeds — the refusal is about
    // holding a 1.24 GB download, not about the GPU.
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
    // The WebGPU variant needs a working adapter and enough reported RAM.
    // Safari reaches the same branch through the same probe.
    stubChrome();
    expect(await detectAsrBackend()).toBe('webgpu');
  });

  it('does not mistake Chrome-on-macOS for Safari', async () => {
    // Chrome's UA contains "Safari/537.36" — the vendor check is what tells
    // them apart, not the UA alone.
    const { isSafariEngine } = await import('./backend-detect');
    stubChrome();
    expect(isSafariEngine()).toBe(false);
    stubSafari();
    expect(isSafariEngine()).toBe(true);
  });
});
