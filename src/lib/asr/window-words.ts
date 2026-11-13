import { CUT_ECHO_SAMPLES, LIVE_SAMPLE_RATE as SR } from './live-chunker-defaults';
import type { LiveChunkerConfig, LiveWindowRequest, TimedWord, TimelineWord } from './types';
import { agreedPrefix, cleanWords, normalizeWord } from './word-text';

export interface CommitPlan {
  count: number;
  discardBefore: number | null;
}

export function recognisedWords(
  req: LiveWindowRequest,
  words: readonly TimedWord[],
  beforeCut: TimelineWord | null,
): TimelineWord[] {
  const onTimeline: TimelineWord[] = cleanWords(words).map((w) => ({
    text: w.text,
    start: req.startSample + Math.round(w.start * SR),
    end: req.startSample + Math.round(w.end * SR),
    confidence: w.confidence,
  }));
  if (beforeCut && onTimeline.length > 0 && onTimeline[0].start - req.startSample < CUT_ECHO_SAMPLES) {
    const tail = normalizeWord(beforeCut.text);
    const head = normalizeWord(onTimeline[0].text);
    if (head && tail.endsWith(head)) onTimeline.shift();
  }
  return onTimeline;
}

export function planCommit(
  req: LiveWindowRequest,
  ws: readonly TimelineWord[],
  hyp: readonly TimelineWord[],
  cfg: LiveChunkerConfig,
): CommitPlan {
  let count = 0;
  let discardBefore: number | null = null;
  if (req.audio.length >= cfg.trimAfterSamples) {
    const winEnd = req.startSample + req.audio.length;
    const settled = winEnd - cfg.keepTailSamples;
    const agreed = agreedPrefix(hyp, ws);
    while (count < agreed && ws[count].end <= settled) count += 1;
    if (count === 0 && req.audio.length >= cfg.maxWindowSamples) {
      while (count < ws.length && ws[count].end <= settled) count += 1;
      if (count === 0 && ws.length === 0) discardBefore = settled;
    }
  }
  return { count, discardBefore };
}

export function cutBetween(last: TimelineWord, next: TimelineWord | undefined): number {
  if (!next) return last.end;
  return next.start >= last.end ? Math.round((last.end + next.start) / 2) : next.start;
}
