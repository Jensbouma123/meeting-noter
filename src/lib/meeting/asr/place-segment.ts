import type { BrowserSegment } from '@/lib/asr/browser';
import { CAPTURE_SAMPLE_RATE } from '../pcm';
import type { Segment, SegmentWord } from '../types';
import { asrState } from './state';
import { lowConfidenceSpans } from './low-confidence';

const segmentSpans = new Map<string, { start: number; end: number }>();
const segmentWords = new Map<string, SegmentWord[]>();

export function clearSegmentTracking(): void {
  segmentSpans.clear();
  segmentWords.clear();
}

function toCaptureClockWords(seg: BrowserSegment, winStart: number): SegmentWord[] | undefined {
  if (!seg.words) return undefined;
  const words = [
    ...(segmentWords.get(seg.id) ?? []),
    ...seg.words.map((w) => ({
      text: w.text,
      start: winStart + w.start,
      end: winStart + w.end,
      ...(w.confidence !== undefined ? { confidence: w.confidence } : {}),
    })),
  ];
  if (seg.final) segmentWords.delete(seg.id);
  else segmentWords.set(seg.id, words);
  return words;
}

export function placeSegment(seg: BrowserSegment): Segment {
  let start = seg.start;
  let end = seg.end;
  let words: SegmentWord[] | undefined;
  const win = asrState.windowInFlight;
  if (win && win.source === seg.source) {
    const winStart = win.startSample / CAPTURE_SAMPLE_RATE;
    const winEnd = (win.startSample + win.samples) / CAPTURE_SAMPLE_RATE;
    const span = segmentSpans.get(seg.id);
    start = span ? Math.min(span.start, winStart) : winStart;
    end = span ? Math.max(span.end, winEnd) : winEnd;
    if (seg.final) segmentSpans.delete(seg.id);
    else segmentSpans.set(seg.id, { start, end });
    words = toCaptureClockWords(seg, winStart);
  }
  const speaker = asrState.speakerTimeline?.speakerFor(seg.source, start, end) ?? seg.speaker;
  const lowConfSpans = seg.final && words ? lowConfidenceSpans(seg.text, words) : [];
  return {
    id: seg.id,
    source: seg.source,
    speaker,
    text: seg.text,
    start,
    end,
    final: seg.final,
    ...(words ? { words } : {}),
    ...(lowConfSpans.length > 0 ? { lowConfSpans } : {}),
  };
}
