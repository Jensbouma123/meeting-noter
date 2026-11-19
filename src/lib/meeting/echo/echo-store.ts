import { CAPTURE_SAMPLE_RATE } from '../pcm';
import type { Source } from '../types/basics';
import type { EchoFrames } from '../types/echo-frames';
import { BandEnvelope, ECHO_FRAME_SAMPLES } from './band-envelope';

const envelopes = new Map<Source, BandEnvelope>();

export const secondsToEchoFrame = (seconds: number): number =>
  Math.round((seconds * CAPTURE_SAMPLE_RATE) / ECHO_FRAME_SAMPLES);

export function pushEchoAudio(source: Source, samples: Float32Array, at?: number): void {
  let env = envelopes.get(source);
  if (!env) {
    env = new BandEnvelope();
    envelopes.set(source, env);
  }
  env.push(samples, at);
}

export function echoFrames(source: Source, fromFrame: number, toFrame: number): EchoFrames | null {
  return envelopes.get(source)?.frames(fromFrame, toFrame) ?? null;
}

export function clearEchoAudio(): void {
  envelopes.clear();
}
