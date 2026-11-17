import { describe, expect, it, vi } from 'vitest';
import { LANGID_N_SAMPLES } from './manifest';
import { FIVE_SECONDS, setupWorkerHarness } from './worker.testSupport';
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
  it('posts the best language the ASR supports, not an exotic top-1', async () => {
    fakes.detect.mockResolvedValue([
      { code: 'ha', confidence: 0.5 },
      { code: 'nl', confidence: 0.3 },
    ]);
    h.send({ type: 'init', id: 'mic' });
    h.send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();
    expect(h.posted.filter((m) => m.type === 'language')).toMatchObject([{ code: 'nl', confidence: 0.3 }]);
  });

  it('drops audio for an id it was never given, or that was disposed', async () => {
    h.send({ type: 'push', id: 'ghost', samples: new Float32Array(FIVE_SECONDS) });
    h.send({ type: 'init', id: 'mic' });
    h.send({ type: 'dispose', id: 'mic' });
    h.send({ type: 'push', id: 'mic', samples: new Float32Array(FIVE_SECONDS) });
    await settle();

    expect(fakes.load).not.toHaveBeenCalled();
    expect(fakes.detect).not.toHaveBeenCalled();
    expect(h.posted).toEqual([]);
  });

  it('runs detection on exactly the last 30 s once more than that has arrived', async () => {
    h.send({ type: 'init', id: 'mic' });
    const frame = 16_000;
    const total = 46 * 16_000;
    fakes.detect.mockImplementation(async () => [{ code: 'nl', confidence: 0.9 }]);
    for (let start = 0; start < total; start += frame) {
      const samples = new Float32Array(frame);
      for (let i = 0; i < frame; i += 1) samples[i] = start + i;
      h.send({ type: 'push', id: 'mic', samples });
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
