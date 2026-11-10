/**
 * pcm16 AudioWorkletProcessor
 *
 * Input: Float32 mono/stereo render quanta at the context sample rate.
 * Output (posted to port): { type: 'frame', pcm: ArrayBuffer, rms: number }
 *   - pcm: 1600 Int16LE mono samples @ 16 kHz (100 ms), transferable.
 *   - rms: 0..1 RMS level of the frame (for meters; not sent to server).
 *
 * Resampling is a fractional box average: input samples accumulate until
 * they cover one 16 kHz output period, then the mean is emitted. Leftover
 * fractions carry across process() calls, so block boundaries are seamless.
 * No allocations per output frame beyond the frame buffer itself.
 */

const OUT_RATE = 16000;
const FRAME_SAMPLES = 1600; // 100 ms

class Pcm16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    const inRate = opts.inputSampleRate || sampleRate;
    this._ratio = inRate / OUT_RATE; // input samples per output sample
    this._buf = new Int16Array(FRAME_SAMPLES);
    this._n = 0;
    this._acc = 0;
    this._accN = 0;
    this._phase = 0; // fractional input samples carried into the next output period
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
        mono /= channels;
        this._acc += mono;
        this._accN += 1;
        this._phase += 1;
        if (this._phase >= this._ratio) {
          this._phase -= this._ratio;
          this._emit(this._acc / this._accN);
          this._acc = 0;
          this._accN = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm16', Pcm16Processor);
