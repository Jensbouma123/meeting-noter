import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGID_N_SAMPLES } from './manifest';

/**
 * The worker's buffering and scheduling, driven through its message handler
 * with the model and mel front end stood in: `self` and `postMessage` are
 * stubbed, so each test imports a fresh copy of the module.
 */

const fakes = vi.hoisted(() => ({
  load: vi.fn(),
  detect: vi.fn(),
  mel: vi.fn((samples: Float32Array) => samples),
  speech: vi.fn(() => Number.POSITIVE_INFINITY),
}));

vi.mock('./model', () => ({
  loadLangIdModel: fakes.load,
  detectLanguage: fakes.detect,
}));

vi.mock('./speech', () => ({
  countSpeechSamples: fakes.speech,
}));

vi.mock('./mel', () => ({
  computeLogMelSpectrogram: fakes.mel,
}));

const FIVE_SECONDS = 5 * 16_000;
const TWENTY_SECONDS = 20 * 16_000;

type Out = { type: string; id: string; code?: string; message?: string };
let posted: Out[];
let handler: (event: { data: unknown }) => void;

async function loadWorker(): Promise<void> {
  vi.resetModules();
  const self = {} as { onmessage?: (event: { data: unknown }) => void };
  vi.stubGlobal('self', self);
  vi.stubGlobal('postMessage', (message: Out) => posted.push(message));
  await import('./worker');
  handler = self.onmessage!;
}

function send(data: unknown): void {
  handler({ data });
}

/** Let queued inference passes (and their awaits) finish. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
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

describe('langid worker', () => {
  it('never runs two sources through the shared sessions at once', async () => {
    let inFlight = 0;
    fakes.detect.mockImplementation(async () => {
      // A real ORT session rejects an overlapping run ("Session already started").
      if (inFlight > 0) throw new Error('Session already started');
      inFlight += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return [{ code: 'nl', confidence: 0.9 }];
    });
    send({ type: 'init', id: 'mic' });
    send({ type: 'init', id: 'system' });

    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    send({ type: 'push', id: 'system', samples: new Float32Array(FIVE_SECONDS) });
    await settle();

    expect(posted.filter((m) => m.type === 'error')).toEqual([]);
    expect(posted.filter((m) => m.type === 'language').map((m) => m.id).sort()).toEqual(['mic', 'system']);
  });

  it('retries a failed model load on the next recheck instead of caching the failure', async () => {
    fakes.load.mockRejectedValueOnce(new Error('offline'));
    send({ type: 'init', id: 'mic' });

    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(posted.filter((m) => m.type === 'error').map((m) => m.message)).toEqual(['offline']);

    send({ type: 'push', id: 'mic', samples: new Float32Array(TWENTY_SECONDS) });
    await settle();
    expect(fakes.load).toHaveBeenCalledTimes(2);
    expect(posted.filter((m) => m.type === 'language')).toHaveLength(1);
  });

  it('does not identify silence, and looks again after 5 s rather than 20 s', async () => {
    fakes.speech.mockReturnValueOnce(0);
    send({ type: 'init', id: 'mic' });
    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(fakes.load).not.toHaveBeenCalled();
    expect(posted).toEqual([]);

    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(posted.filter((m) => m.type === 'language')).toHaveLength(1);
  });

  it('posts the best language the ASR supports, not an exotic top-1', async () => {
    fakes.detect.mockResolvedValue([
      { code: 'ha', confidence: 0.5 },
      { code: 'nl', confidence: 0.3 },
    ]);
    send({ type: 'init', id: 'mic' });
    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(posted.filter((m) => m.type === 'language')).toMatchObject([{ code: 'nl', confidence: 0.3 }]);
  });

  it('drops audio for an id it was never given, or that was disposed', async () => {
    send({ type: 'push', id: 'ghost', samples: new Float32Array(FIVE_SECONDS) });
    send({ type: 'init', id: 'mic' });
    send({ type: 'dispose', id: 'mic' });
    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();

    expect(fakes.load).not.toHaveBeenCalled();
    expect(fakes.detect).not.toHaveBeenCalled();
    expect(posted).toEqual([]);
  });

  it('runs detection on exactly the last 30 s once more than that has arrived', async () => {
    send({ type: 'init', id: 'mic' });
    // A ramp in 1 s frames. Passes fire at 5 s, 25 s and 45 s; only the last
    // sees more than 30 s of audio.
    const frame = 16_000;
    const total = 46 * 16_000;
    fakes.detect.mockImplementation(async () => [{ code: 'nl', confidence: 0.9 }]);
    for (let start = 0; start < total; start += frame) {
      const samples = new Float32Array(frame);
      for (let i = 0; i < frame; i += 1) samples[i] = start + i;
      send({ type: 'push', id: 'mic', samples });
      await settle();
    }

    expect(fakes.mel).toHaveBeenCalledTimes(3);
    const lastWindow = fakes.mel.mock.calls[fakes.mel.mock.calls.length - 1][0];
    expect(lastWindow).toHaveLength(LANGID_N_SAMPLES);
    const end = lastWindow[lastWindow.length - 1] + 1;
    expect(end).toBeGreaterThan(LANGID_N_SAMPLES);
    expect(lastWindow[0]).toBe(end - LANGID_N_SAMPLES);
  });
});
