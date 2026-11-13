import type { ContextBiaser } from '../../vocabulary/bias';
import { NEMOTRON } from './nemotron-constants';
import type { NemotronPredictionState } from './nemotron-prediction-state';
import type { NemotronToken, OrtLike, SessionLike } from './types';

export async function greedyDecodeChunk(
  ort: OrtLike,
  joint: SessionLike,
  decoder: NemotronPredictionState,
  enc: Float32Array,
  frames: number,
  frameBase: number,
  biaser: ContextBiaser | null = null,
): Promise<NemotronToken[]> {
  const { hidden, predHidden, vocabSize, blankId, maxSymbolsPerStep } = NEMOTRON;
  const emitted: NemotronToken[] = [];
  let t = 0;
  let symbols = 0;
  while (t < frames) {
    const dec = await decoder.output();
    const span = frames - t;
    const out = await joint.run({
      encoder_output: new ort.Tensor('float32', enc.subarray(t * hidden, frames * hidden), [1, span, hidden]),
      decoder_output: new ort.Tensor('float32', dec, [1, 1, predHidden]),
    });
    const logits = out.joint_output.data as Float32Array;

    const bonus = biaser ? biaser.currentBonus() : null;
    let hit = -1;
    let best: number = blankId;
    let bestLp = 0;
    for (let f = 0; f < span; f++) {
      const row = f * vocabSize;
      let arg = 0;
      let max = -Infinity;
      for (let v = 0; v < vocabSize; v++) {
        const x = bonus ? logits[row + v] + bonus[v] : logits[row + v];
        if (x > max) {
          max = x;
          arg = v;
        }
      }
      if (arg !== blankId) {
        hit = f;
        best = arg;
        bestLp = logits[row + arg];
        break;
      }
    }
    out.joint_output.dispose?.();
    if (hit < 0) break;
    if (hit > 0) symbols = 0;
    t += hit;
    emitted.push({ id: best, frame: frameBase + t, logProb: bestLp });
    decoder.commit(best);
    biaser?.advance(best);
    symbols += 1;
    if (symbols >= maxSymbolsPerStep) {
      t += 1;
      symbols = 0;
    }
  }
  return emitted;
}

