/**
 * pcm16 AudioWorkletProcessor
 *
 * Input: Float32 mono/stereo render quanta at the context sample rate.
 * Output (posted to port): { type: 'frame', pcm: ArrayBuffer, rms: number }
 *   - pcm: 1600 Int16LE mono samples @ 16 kHz (100 ms), transferable.
 *   - rms: 0..1 RMS level of the frame (for meters; not sent to server).
 *
 * Resampling is band-limited (`resampler.js`): a low-pass at 7.2 kHz keeps
 * 8–24 kHz content from folding into the speech band. Its state carries
 * across process() calls, so block boundaries are seamless. No allocations
 * per output frame beyond the frame buffer itself.
 */

import { Resampler } from './resampler.js';

const FRAME_SAMPLES = 1600; // 100 ms

class Pcm16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    const inRate = opts.inputSampleRate || sampleRate;
    this._resampler = new Resampler(inRate);
    this._emitSample = (x) => this._emit(x);
    this._buf = new Int16Array(FRAME_SAMPLES);
    this._n = 0;
    this._sumSq = 0;
    this._sumN = 0;
  }

  _emit(x) {
    this._sumSq += x * x;
    this._sumN += 1;
    const clamped = x < -1 ? -1 : x > 1 ? 1 : x;
    this._buf[this._n++] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    if (this._n >= FRAME_SAMPLES) {
      const rms = this._sumN > 0 ? Math.min(1, Math.sqrt(this._sumSq / this._sumN)) : 0;
      const out = this._buf;
      this._buf = new Int16Array(FRAME_SAMPLES);
      this._n = 0;
      this._sumSq = 0;
      this._sumN = 0;
      this.port.postMessage({ type: 'frame', rms, pcm: out.buffer }, [out.buffer]);
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const frames = input[0].length;
      const channels = input.length;
      for (let i = 0; i < frames; i++) {
        let mono = input[0][i];
        for (let c = 1; c < channels; c++) mono += input[c][i];
        this._resampler.push(mono / channels, this._emitSample);
      }
    }
    return true;
  }
}

registerProcessor('pcm16', Pcm16Processor);
