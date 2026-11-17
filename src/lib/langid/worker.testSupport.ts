import { afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { PostedMessage } from './types';

export const FIVE_SECONDS = 5 * 16_000;
export const TWENTY_SECONDS = 20 * 16_000;

export type WorkerFakes = Record<'load' | 'detect' | 'mel' | 'speech', Mock>;

export interface WorkerHarness {
  posted: PostedMessage[];
  send(data: unknown): void;
}

type MessageHandler = (event: { data: unknown }) => void;

export function setupWorkerHarness(fakes: WorkerFakes): WorkerHarness {
  let handler: MessageHandler;
  const harness: WorkerHarness = {
    posted: [],
    send: (data) => handler({ data }),
  };

  async function loadWorker(): Promise<void> {
    vi.resetModules();
    const self = {} as { onmessage?: MessageHandler };
    vi.stubGlobal('self', self);
    vi.stubGlobal('postMessage', (message: PostedMessage) => harness.posted.push(message));
    await import('./worker');
    handler = self.onmessage!;
  }

  beforeEach(async () => {
    harness.posted = [];
    fakes.load.mockReset().mockResolvedValue({ encoder: {}, decoder: {}, backend: 'wasm' });
    fakes.detect.mockReset().mockResolvedValue([{ code: 'nl', confidence: 0.9 }]);
    fakes.mel.mockClear();
    fakes.speech.mockReset().mockReturnValue(Number.POSITIVE_INFINITY);
    await loadWorker();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  return harness;
}
