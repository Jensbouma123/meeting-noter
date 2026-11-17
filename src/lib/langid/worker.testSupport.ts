import { afterEach, beforeEach, vi } from 'vitest';
import type { PostedMessage } from './types';

export const fakes = vi.hoisted(() => ({
  load: vi.fn(),
  detect: vi.fn(),
  mel: vi.fn((samples: Float32Array) => samples),
  speech: vi.fn(() => Number.POSITIVE_INFINITY),
}));

vi.mock('./model', () => ({
  loadLangIdModel: fakes.load,
}));

vi.mock('./detect-language', () => ({
  detectLanguage: fakes.detect,
}));

vi.mock('./speech', () => ({ countSpeechSamples: fakes.speech }));

vi.mock('./mel', () => ({ computeLogMelSpectrogram: fakes.mel }));

export const FIVE_SECONDS = 5 * 16_000;
export const TWENTY_SECONDS = 20 * 16_000;

export let posted: PostedMessage[] = [];
export let handler: (event: { data: unknown }) => void;

export async function loadWorker(): Promise<void> {
  vi.resetModules();
  const self = {} as { onmessage?: (event: { data: unknown }) => void };
  vi.stubGlobal('self', self);
  vi.stubGlobal('postMessage', (message: PostedMessage) => posted.push(message));
  await import('./worker');
  handler = self.onmessage!;
}

export function send(data: unknown): void {
  handler({ data });
}

beforeEach(async () => {
  posted = [];
  fakes.load.mockReset().mockResolvedValue({ encoder: {}, decoder: {}, backend: 'wasm' });
  fakes.detect.mockReset().mockResolvedValue([{ code: 'nl', confidence: 0.9 }]);
  fakes.mel.mockClear();
  fakes.speech.mockReset().mockReturnValue(Number.POSITIVE_INFINITY);
  await loadWorker();
});

afterEach(() => {
  vi.unstubAllGlobals();
});
