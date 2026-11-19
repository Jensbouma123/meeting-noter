import type { EvalCase } from '../types/eval-case';
import type { RenderedCase } from '../types/rendered-case';
import type { Utterance } from '../types/utterance';
import { activity, duckNear } from './aec-residual';
import { bleedMicSignal, mixInto } from './bleed-synth';
import { hashString } from './rng';

const SR = 16_000;
const TARGET_RMS = 0.07;

export function leveled(u: Utterance): Float32Array {
  const rms = Math.sqrt(u.audio.reduce((s, v) => s + v * v, 0) / u.audio.length) || 1;
  return u.audio.map((v) => v * (TARGET_RMS / rms));
}

export function renderCase(c: EvalCase, byId: Map<string, Utterance>): RenderedCase {
  const sysUtt = byId.get(c.systemUtt)!;
  const lead = Math.round(0.2 * SR);
  const tail = SR * 2;
  const sysSrc = leveled(sysUtt);
  const micUtt = c.micUtt ? byId.get(c.micUtt)! : null;
  const micSrc = micUtt ? leveled(micUtt) : null;
  const micStart = lead + Math.round(c.offsetSec * SR);
  const total = Math.max(lead + sysSrc.length, micSrc ? micStart + micSrc.length : 0) + tail;
  const system = new Float32Array(total);
  mixInto(system, sysSrc, lead);
  const mic = c.bleed ? bleedMicSignal(system, c.bleed, total, hashString(c.id)) : new Float32Array(total);
  if (micSrc) {
    const duck = c.bleed?.aecDuckDb;
    mixInto(mic, duck ? duckNear(micSrc, micStart, activity(system), duck) : micSrc, micStart);
  }
  return { system, mic };
}
