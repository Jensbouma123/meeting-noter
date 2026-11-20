import path from 'node:path';
import type { TruthTurn, TwoSpeakerClip } from '../types/two-speaker-clip';
import { readWav16kMono } from './wav-io';

const RATE = 16_000;

export function buildTwoSpeakerClip(fileA: string, fileB: string, rounds = 2, gapSec = 0.6): TwoSpeakerClip {
  const voices = [fileA, fileB].map((f) => ({ id: path.basename(f, '.wav'), pcm: readWav16kMono(f) }));
  const gap = Math.round(gapSec * RATE);
  const order = Array.from({ length: rounds * 2 }, (_, i) => voices[i % 2]);
  const total = order.reduce((n, v) => n + v.pcm.length + gap, gap);
  const pcm = new Float32Array(total);
  const truth: TruthTurn[] = [];
  let at = gap;
  for (const v of order) {
    pcm.set(v.pcm, at);
    truth.push({ speaker: v.id, start: at / RATE, end: (at + v.pcm.length) / RATE });
    at += v.pcm.length + gap;
  }
  return { pcm, truth };
}
