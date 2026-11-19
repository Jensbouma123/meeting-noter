import type { MeetingCase, MeetingTurn } from '../types/meeting-case';
import type { RenderedCase } from '../types/rendered-case';
import type { Utterance } from '../types/utterance';
import { activity, duckNear } from './aec-residual';
import { bleedMicSignal, mixInto } from './bleed-synth';
import { leveled } from './render-case';
import { hashString } from './rng';

const SR = 16_000;
const FADE = Math.round(0.03 * SR);

function clipped(src: Float32Array, turn: MeetingTurn): Float32Array {
  if (turn.clipSec === null) return src;
  const out = src.slice(0, Math.round(turn.clipSec * SR));
  for (let i = 0; i < FADE && i < out.length; i += 1) {
    out[i] *= i / FADE;
    out[out.length - 1 - i] *= i / FADE;
  }
  return out;
}

export function renderMeeting(c: MeetingCase, byId: Map<string, Utterance>): RenderedCase {
  const total = Math.ceil((c.durationSec + 2) * SR);
  const system = new Float32Array(total);
  const at = (t: MeetingTurn) => Math.round(t.startSec * SR);
  const audio = (t: MeetingTurn) => clipped(leveled(byId.get(t.utt)!), t);
  for (const t of c.turns) if (t.role === 'remote') mixInto(system, audio(t), at(t));
  const mic = c.bleed ? bleedMicSignal(system, c.bleed, total, hashString(c.id)) : new Float32Array(total);
  const act = activity(system);
  const duck = c.bleed?.aecDuckDb;
  for (const t of c.turns) {
    if (t.role !== 'local') continue;
    const src = audio(t);
    mixInto(mic, duck ? duckNear(src, at(t), act, duck) : src, at(t));
  }
  return { system, mic };
}
