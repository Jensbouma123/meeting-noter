/**
 * Who-is-who across recordings of one session. A recording appended to a
 * transcript runs a new diarizer, and Sortformer numbers speakers by arrival
 * order in its speaker cache: from an empty cache, whoever speaks first is
 * channel 0 again, and takes the label of the transcript's first speaker.
 * Starting the new diarizer from the previous one's cache (`speaker-cache.ts`
 * `snapshot`/`restore`) keeps each returning voice on its old channel, so on
 * its old `${source}:${k}` id and label.
 *
 * This module holds the JSON form of that cache (stored with the session by
 * `src/lib/meeting/persist.ts`) and the page-side hand-off: the state each
 * source's diarizer reported when it was last flushed, and the state the next
 * diarizer of a source should start from.
 */

import type { SpeakerCacheSnapshot } from './speaker-cache';
import type { Source } from './types';

const STATE_VERSION = 1;

/** A `SpeakerCacheSnapshot` as JSON: float16, little-endian, base64. About
 *  360 KB per source for a full cache. */
export interface SerializedSpeakerState {
  version: number;
  hiddenSize: number;
  numSpeakers: number;
  numFrames: number;
  compressed: boolean;
  embeds: string;
  probs: string;
}

export type SpeakerStates = Partial<Record<Source, SerializedSpeakerState>>;

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** Round to the nearest float16 bit pattern. */
function toHalf(value: number): number {
  f32[0] = value;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const rawExp = (x >>> 23) & 0xff;
  const mant = x & 0x7fffff;
  if (rawExp === 0xff) return sign | (mant ? 0x7e00 : 0x7c00);
  const exp = rawExp - 127 + 15;
  if (exp >= 31) return sign | 0x7c00;
  if (exp <= 0) {
    if (exp < -10) return sign;
    return sign | (((mant | 0x800000) >> (1 - exp)) + 0x1000) >> 13;
  }
  // A carry out of the mantissa rounds up into the exponent, as it should.
  return (sign | (exp << 10) | (mant >> 13)) + ((mant >> 12) & 1);
}

function fromHalf(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const mant = h & 0x3ff;
  if (exp === 0) return sign * mant * 2 ** -24;
  if (exp === 31) return mant ? NaN : sign * Infinity;
  return sign * (1 + mant / 1024) * 2 ** (exp - 15);
}

function encode(values: Float32Array): string {
  const bytes = new Uint8Array(values.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < values.length; i += 1) view.setUint16(i * 2, toHalf(values[i]), true);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decode(text: string, length: number): Float32Array | null {
  let binary: string;
  try {
    binary = atob(text);
  } catch {
    return null;
  }
  if (binary.length !== length * 2) return null;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = fromHalf(binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8));
  }
  return out;
}

export function serializeSpeakerState(
  snapshot: SpeakerCacheSnapshot,
  shape: { hiddenSize: number; numSpeakers: number },
): SerializedSpeakerState {
  return {
    version: STATE_VERSION,
    hiddenSize: shape.hiddenSize,
    numSpeakers: shape.numSpeakers,
    numFrames: snapshot.numFrames,
    compressed: snapshot.compressed,
    embeds: encode(snapshot.embeds),
    probs: encode(snapshot.probs),
  };
}

/** The snapshot `value` holds, or null when it is not one for a model of
 *  this `shape` (another version, a corrupted store). */
export function deserializeSpeakerState(
  value: unknown,
  shape: { hiddenSize: number; numSpeakers: number },
): SpeakerCacheSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<SerializedSpeakerState>;
  if (v.version !== STATE_VERSION || v.hiddenSize !== shape.hiddenSize || v.numSpeakers !== shape.numSpeakers) {
    return null;
  }
  const n = v.numFrames;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return null;
  if (typeof v.embeds !== 'string' || typeof v.probs !== 'string') return null;
  const embeds = decode(v.embeds, n * shape.hiddenSize);
  const probs = decode(v.probs, n * shape.numSpeakers);
  if (!embeds || !probs) return null;
  return { numFrames: n, compressed: v.compressed === true, embeds, probs };
}

/** True for a value shaped like a `SerializedSpeakerState` (contents are
 *  checked when it is deserialized). */
export function isSerializedSpeakerState(value: unknown): value is SerializedSpeakerState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === 'number' &&
    typeof v.hiddenSize === 'number' &&
    typeof v.numSpeakers === 'number' &&
    typeof v.numFrames === 'number' &&
    typeof v.embeds === 'string' &&
    typeof v.probs === 'string'
  );
}

/* ------------------------------------------------------------------ */
/* Page-side hand-off                                                  */
/* ------------------------------------------------------------------ */

const reported = new Map<Source, SerializedSpeakerState>();
const seeds = new Map<Source, SerializedSpeakerState>();

/** Record the state a source's diarizer reported on flush. */
export function reportSpeakerState(source: Source, state: SerializedSpeakerState): void {
  reported.set(source, state);
}

/** The states reported since the last call, per source; clears them. */
export function takeReportedSpeakerStates(): SpeakerStates {
  const out: SpeakerStates = Object.fromEntries(reported);
  reported.clear();
  return out;
}

/** Make the diarizers of each source in `states` start from its state; null
 *  (or a missing source) starts them from an empty cache. Replaces any
 *  earlier seeds, and drops states reported by an earlier recording. */
export function seedSpeakerStates(states: SpeakerStates | null): void {
  seeds.clear();
  reported.clear();
  for (const [source, state] of Object.entries(states ?? {}) as [Source, SerializedSpeakerState][]) {
    if (isSerializedSpeakerState(state)) seeds.set(source, state);
  }
}

/** The seed for `source`'s diarizers, if any. Kept until the next
 *  `seedSpeakerStates`: a diarizer re-created after a failed model load
 *  starts from it too. */
export function speakerSeedFor(source: Source): SerializedSpeakerState | undefined {
  return seeds.get(source);
}
