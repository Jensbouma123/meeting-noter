import { describe, expect, it } from 'vitest';
import { LANGID_N_SAMPLES } from './manifest';
import { settle } from './worker-test-helpers';
import { FIVE_SECONDS, TWENTY_SECONDS, fakes, posted, send } from './worker.testSupport';

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
    send({ type: 'init', id: 'mic' });
    send({ type: 'init', id: 'system' });

    send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    send({ type: 'push', id: 'system', samples: new Float32Array(FIVE_SECONDS) });
    await settle();

    expect(posted.filter((m) => m.type === 'error')).toEqual([]);
    expect(
      posted
        .filter((m) => m.type === 'language')
        .map((m) => m.id)
        .sort(),
    ).toEqual(['mic', 'system']);
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
