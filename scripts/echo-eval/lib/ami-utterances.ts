import fs from 'node:fs';
import path from 'node:path';
import type { Span } from '../types/span';
import type { Utterance } from '../types/utterance';
import { hashString } from './rng';
import { readWav16kMono } from './wav-io';

const SR = 16_000;

function singleSpeakerSpans(spans: Span[], minS: number, maxS: number, margin: number): Span[] {
  return spans.filter(
    (a) =>
      a.end - a.start >= minS &&
      a.end - a.start <= maxS &&
      !spans.some((o) => o.speaker !== a.speaker && o.start < a.end + margin && o.end > a.start - margin),
  );
}

function wordRuns(file: string): Span[] {
  const words = JSON.parse(fs.readFileSync(file, 'utf8')) as { start: number; end: number; speaker: string }[];
  const runs: Span[] = [];
  for (const w of words) {
    const last = runs[runs.length - 1];
    if (last && last.speaker === w.speaker && w.start - last.end < 0.5) last.end = w.end;
    else runs.push({ start: w.start, end: w.end, speaker: w.speaker });
  }
  return runs;
}

function labelSpans(file: string): Span[] {
  const l = JSON.parse(fs.readFileSync(file, 'utf8')) as { timestamps_start: number[]; timestamps_end: number[]; speakers: string[] };
  return l.speakers.map((speaker, i) => ({ speaker, start: l.timestamps_start[i], end: l.timestamps_end[i] }));
}

export function loadAmiUtterances(dir: string): Utterance[] {
  const five = readWav16kMono(path.join(dir, 'ami-EN2002b-5min.wav'));
  const full = readWav16kMono(path.join(dir, 'ami-EN2002b-full.wav'));
  const sources: [string, Float32Array, Span[]][] = [
    ['a5', five, singleSpeakerSpans(wordRuns(path.join(dir, 'ami-EN2002b-5min.words.json')), 1.8, 14, 0.15)],
    ['f', full, singleSpeakerSpans(labelSpans(path.join(dir, 'ami-meeting-1.labels.json')), 1.8, 14, 0.15)],
  ];
  const out: Utterance[] = [];
  for (const [tag, audio, spans] of sources) {
    for (const s of spans) {
      const slice = audio.slice(Math.floor((s.start - 0.05) * SR), Math.ceil((s.end + 0.05) * SR));
      const id = `${tag}-${s.start.toFixed(2)}`;
      out.push({
        id,
        speaker: `${tag}:${s.speaker}`,
        seconds: slice.length / SR,
        split: hashString(id) % 2 === 0 ? 'dev' : 'heldout',
        audio: slice,
      });
    }
  }
  return out;
}
