import { LiveChunker } from './live-chunker';
import { LIVE_SAMPLE_RATE } from './live-chunker-defaults';
import type { LiveSegmentUpdate, ScriptWord, TimedWord } from './types';
import { voice } from './test-signals';

const SR = LIVE_SAMPLE_RATE;
export const FRAME = SR / 10;

export function script(count: number, from = 0.5): ScriptWord[] {
  return Array.from({ length: count }, (_, i) => ({
    text: `word${i}`,
    start: from + i * 0.5,
    end: from + i * 0.5 + 0.4,
  }));
}

export function recognizer(words: ScriptWord[]) {
  return (startSample: number, samples: number): TimedWord[] => {
    const from = startSample / SR;
    const to = (startSample + samples) / SR;
    const out: TimedWord[] = [];
    for (const w of words) {
      if (w.end <= from || w.start >= to) continue;
      const clippedStart = w.start < from;
      const clippedEnd = w.end > to;
      let text = w.text;
      if (clippedStart) text = text.slice(2);
      if (clippedEnd) text = text.slice(0, 2);
      out.push({ text, start: Math.max(w.start, from) - from, end: Math.min(w.end, to) - from });
    }
    if (out.length > 0) out[out.length - 1] = { ...out[out.length - 1], text: out[out.length - 1].text + '.' };
    return out;
  };
}

export function frameAt(index: number, speech: (t: number) => boolean): Float32Array {
  const t = (index * FRAME) / SR;
  return speech(t) ? voice(FRAME, 0.3, index * FRAME) : new Float32Array(FRAME);
}

export function run(
  seconds: number,
  speech: (t: number) => boolean,
  recognize: (startSample: number, samples: number) => TimedWord[],
  chunker = new LiveChunker(idFactory()),
) {
  const segments = new Map<string, LiveSegmentUpdate>();
  const requests: { start: number; samples: number; final: boolean }[] = [];
  const apply = (req: NonNullable<ReturnType<LiveChunker['take']>>) => {
    requests.push({ start: req.startSample, samples: req.audio.length, final: req.final });
    for (const u of chunker.apply(req, recognize(req.startSample, req.audio.length))) segments.set(u.id, u);
  };
  for (let i = 0; i < (seconds * SR) / FRAME; i += 1) {
    chunker.push(frameAt(i, speech), i * FRAME);
    if (chunker.due()) apply(chunker.take()!);
  }
  const last = chunker.take(true);
  if (last) apply(last);
  return { segments: [...segments.values()], requests };
}

export function idFactory() {
  let n = 0;
  return () => `s${++n}`;
}

export const words = (text: string) => text.split(/\s+/).map((w) => w.replace(/[^\w]/g, ''));
