import { decodeHalfFloatsBase64, encodeHalfFloatsBase64 } from './speaker-state-codec';
import type { SerializedSpeakerState, SpeakerCacheSnapshot, SpeakerStateShape } from './types';

const STATE_VERSION = 1;

export function serializeSpeakerState(
  snapshot: SpeakerCacheSnapshot,
  shape: SpeakerStateShape,
): SerializedSpeakerState {
  return {
    version: STATE_VERSION,
    hiddenSize: shape.hiddenSize,
    numSpeakers: shape.numSpeakers,
    numFrames: snapshot.numFrames,
    compressed: snapshot.compressed,
    embeds: encodeHalfFloatsBase64(snapshot.embeds),
    probs: encodeHalfFloatsBase64(snapshot.probs),
  };
}

export function deserializeSpeakerState(
  value: unknown,
  shape: SpeakerStateShape,
): SpeakerCacheSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<SerializedSpeakerState>;
  if (v.version !== STATE_VERSION || v.hiddenSize !== shape.hiddenSize || v.numSpeakers !== shape.numSpeakers) {
    return null;
  }
  const n = v.numFrames;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return null;
  if (typeof v.embeds !== 'string' || typeof v.probs !== 'string') return null;
  const embeds = decodeHalfFloatsBase64(v.embeds, n * shape.hiddenSize);
  const probs = decodeHalfFloatsBase64(v.probs, n * shape.numSpeakers);
  if (!embeds || !probs) return null;
  return { numFrames: n, compressed: v.compressed === true, embeds, probs };
}

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
