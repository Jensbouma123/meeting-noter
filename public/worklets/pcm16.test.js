import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `_ratio` (input samples per output sample) is fractional at any input rate
 * that isn't an exact 16 kHz multiple (44.1 kHz -> 2.75625, 24 kHz -> 1.5).
 * The fractional remainder must carry across `process()` calls — otherwise
 * the resampler locks onto a fixed integer ratio (always 3 at 44.1 kHz,
 * always 2 at 24 kHz, since an integer sample count is compared against a
 * fractional ratio and reset to 0 each time) and mislabels a faster rate as
 * 16 kHz: 14.7 kHz at 44.1 kHz input, 12 kHz at 24 kHz input. 48 kHz is an
 * exact multiple (ratio 3), so it is unaffected either way.
 */

let Pcm16Processor;

beforeEach(async () => {
  class FakeAudioWorkletProcessor {
    constructor() {
      this.port = { postMessage: vi.fn() };
    }
  }
  vi.stubGlobal('AudioWorkletProcessor', FakeAudioWorkletProcessor);
  vi.stubGlobal('registerProcessor', (_name, ctor) => {
    Pcm16Processor = ctor;
  });
  vi.stubGlobal('sampleRate', 48000);
  vi.resetModules();
  await import('./pcm16.js');
});

/**
 * Feeds `totalInputSamples` of constant-level mono audio through `process()`
 * in real-sized 128-sample render quanta, and returns the number of
 * 1600-sample (100 ms) output frames the processor emitted.
 */
function framesEmitted(inputSampleRate, totalInputSamples, chunkSize = 128) {
  const proc = new Pcm16Processor({ processorOptions: { inputSampleRate } });
  for (let consumed = 0; consumed < totalInputSamples; consumed += chunkSize) {
    const n = Math.min(chunkSize, totalInputSamples - consumed);
    const channel = new Float32Array(n).fill(0.1);
    proc.process([[channel]]);
  }
  return proc.port.postMessage.mock.calls.length;
}

// A true 16 kHz output emits 100 frames per 10 s of input, regardless of the
// input rate. A couple of render quanta of margin are fed past the 10 s mark
// so a boundary rounded the "wrong" way by floating-point error never costs a
// whole counted frame; the old fixed-ratio bug undershoots this by a lot more
// than rounding ever could (91 frames at 44.1 kHz, 75 at 24 kHz).
const TEN_SECONDS_OF_FRAMES = 100;
const MARGIN_SAMPLES = 256;

describe('pcm16 resampling — fractional ratio phase carry', () => {
  it('resamples 44.1 kHz to a true 16 kHz, not a fixed 3:1 (14.7 kHz)', () => {
    expect(framesEmitted(44100, 44100 * 10 + MARGIN_SAMPLES)).toBeGreaterThanOrEqual(TEN_SECONDS_OF_FRAMES);
  });

  it('resamples 24 kHz (e.g. AirPods call mode) to a true 16 kHz, not a fixed 2:1 (12 kHz)', () => {
    expect(framesEmitted(24000, 24000 * 10 + MARGIN_SAMPLES)).toBeGreaterThanOrEqual(TEN_SECONDS_OF_FRAMES);
  });

  it('resamples 48 kHz (an exact multiple) to 16 kHz', () => {
    expect(framesEmitted(48000, 48000 * 10 + MARGIN_SAMPLES)).toBeGreaterThanOrEqual(TEN_SECONDS_OF_FRAMES);
  });
});
