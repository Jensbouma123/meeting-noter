import { expect } from 'vitest';
import type { BridgeTestPush, BridgeTestTurn } from './types/bridge-test';

export const fakes = {
  diarizerPushes: [] as BridgeTestPush[],
  turnListeners: new Map<string, (turn: BridgeTestTurn) => void>(),
  langidPushes: [] as Float32Array[],
  errorListeners: new Map<string, (message: string) => void>(),
  disposed: [] as string[],
};

export async function mockAsrBrowser(importOriginal: () => Promise<typeof import('@/lib/asr/browser')>) {
  return {
    ...(await importOriginal()),
    getModelStatus: () => ({ status: 'cached' }),
    isConsentGiven: () => true,
  };
}

export function mockDiarizationBrowser() {
  return {
    createDiarizer: ({ source }: { source: string }) => ({
      push(chunk: Float32Array, startSample?: number) {
        fakes.diarizerPushes.push({ source, chunk, startSample });
      },
      onSpeakerTurn(cb: (turn: BridgeTestTurn) => void) {
        fakes.turnListeners.set(source, cb);
        return () => fakes.turnListeners.delete(source);
      },
      onError(cb: (message: string) => void) {
        fakes.errorListeners.set(source, cb);
        return () => fakes.errorListeners.delete(source);
      },
      onReady: () => () => {},
      flush: async () => {},
      dispose() {
        fakes.disposed.push(source);
      },
    }),
  };
}

export function mockLangid() {
  return {
    createLanguageDetector: () => ({
      push(samples: Float32Array) {
        fakes.langidPushes.push(samples);
      },
      onLanguage: () => () => {},
      onError: () => () => {},
      dispose() {},
    }),
  };
}

export function frame(): ArrayBuffer {
  const samples = new Int16Array(1600);
  samples[0] = -32768;
  samples[1] = 32767;
  samples[2] = 0;
  samples[3] = 16384;
  samples[4] = -16384;
  for (let i = 5; i < samples.length; i += 1) samples[i] = Math.round(Math.sin(i / 10) * 20000);
  return samples.buffer;
}

export function expectConverted(pushed: Float32Array, pcm: ArrayBuffer): void {
  const int16 = new Int16Array(pcm);
  expect(pushed).toHaveLength(int16.length);
  for (let i = 0; i < int16.length; i += 1) {
    expect(pushed[i]).toBeGreaterThanOrEqual(-1);
    expect(pushed[i]).toBeLessThan(1);
    expect(pushed[i]).toBe(int16[i] / 32768);
  }
  expect(pushed[0]).toBe(-1);
  expect(pushed[1]).toBeCloseTo(0.99997, 5);
  expect(pushed[3]).toBe(0.5);
  expect(pushed[4]).toBe(-0.5);
}
export function clearFakes(): void {
  fakes.diarizerPushes.length = 0;
  fakes.turnListeners.clear();
  fakes.langidPushes.length = 0;
  fakes.errorListeners.clear();
  fakes.disposed.length = 0;
}

export async function resetBridges(): Promise<void> {
  const { resetDiarization } = await import('./diarization-bridge');
  const { stopLangId } = await import('./langid-bridge');
  resetDiarization();
  stopLangId();
}
