import type { MeetingCase } from '../types/meeting-case';
import type { RenderedCase } from '../types/rendered-case';
import { bleedMicSignal } from './bleed-synth';
import { hashString } from './rng';

export function renderExternal(c: MeetingCase, system: Float32Array): RenderedCase {
  const mic = c.bleed ? bleedMicSignal(system, c.bleed, system.length, hashString(c.id)) : new Float32Array(system.length);
  return { system, mic };
}

export function pcm16ToFloat(bytes: ArrayBuffer): Float32Array {
  const pcm = new Int16Array(bytes);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) out[i] = pcm[i] / 32768;
  return out;
}
