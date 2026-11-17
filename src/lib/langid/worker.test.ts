import { describe, expect, it, vi } from 'vitest';
import { FIVE_SECONDS, TWENTY_SECONDS, setupWorkerHarness } from './worker.testSupport';
import { settle } from './worker-test-helpers';

const fakes = vi.hoisted(() => ({
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

const h = setupWorkerHarness(fakes);

describe('langid worker', () => {
  it('never runs two sources through the shared sessions at once', async () => {
    let inFlight = 0;
    fakes.detect.mockImplementation(async () => {
      if (inFlight > 0) throw new Error('Session already started');
      inFlight += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return [{ code: 'nl', confidence: 0.9 }];
    });
    h.send({ type: 'init', id: 'mic' });
    h.send({ type: 'init', id: 'system' });

    h.send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    h.send({ type: 'push', id: 'system', samples: new Float32Array(FIVE_SECONDS) });
    await settle();

    expect(h.posted.filter((m) => m.type === 'error')).toEqual([]);
    expect(
      h.posted
        .filter((m) => m.type === 'language')
        .map((m) => m.id)
        .sort(),
    ).toEqual(['mic', 'system']);
  });

  it('retries a failed model load on the next recheck instead of caching the failure', async () => {
    fakes.load.mockRejectedValueOnce(new Error('offline'));
    h.send({ type: 'init', id: 'mic' });

    h.send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(h.posted.filter((m) => m.type === 'error').map((m) => m.message)).toEqual(['offline']);

    h.send({ type: 'push', id: 'mic', samples: new Float32Array(TWENTY_SECONDS) });
    await settle();
    expect(fakes.load).toHaveBeenCalledTimes(2);
    expect(h.posted.filter((m) => m.type === 'language')).toHaveLength(1);
  });

  it('does not identify silence, and looks again after 5 s rather than 20 s', async () => {
    fakes.speech.mockReturnValueOnce(0);
    h.send({ type: 'init', id: 'mic' });
    h.send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(fakes.load).not.toHaveBeenCalled();
    expect(h.posted).toEqual([]);

    h.send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(h.posted.filter((m) => m.type === 'language')).toHaveLength(1);
  });
});
