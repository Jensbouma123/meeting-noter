import { beforeEach, describe, expect, it, vi } from 'vitest';

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

function framesEmitted(inputSampleRate, totalInputSamples, chunkSize = 128) {
  const proc = new Pcm16Processor({ processorOptions: { inputSampleRate } });
  for (let consumed = 0; consumed < totalInputSamples; consumed += chunkSize) {
    const n = Math.min(chunkSize, totalInputSamples - consumed);
    const channel = new Float32Array(n).fill(0.1);
    proc.process([[channel]]);
  }
  return proc.port.postMessage.mock.calls.length;
}

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
