import type { LiveSegmentUpdate } from '@/lib/asr/types';
import type { SpeakerTimeline } from './types/asr-speaker';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import { withConfirmation } from './speaker-confirmation';
import { installedOverlaps } from './speaker-overlap-timeline';
import { splitBySpeaker } from './speaker-split';
import { replaceSegmentFamily, upsertSegment } from './segment-store';
import type { Segment, Source } from './types';
import type { OverlapAt, SpeakerAt } from './types/speaker-attribution';

export function attributeSpeakers(
  seg: Segment,
  near: SpeakerAt,
  covered: SpeakerAt,
  overlaps: OverlapAt | undefined = installedOverlaps(seg.source),
): Segment[] {
  return withConfirmation(splitBySpeaker(seg, near, covered, overlaps), covered);
}

export function publishLiveUpdate(
  source: Source,
  update: LiveSegmentUpdate,
  timeline: SpeakerTimeline | null,
  fallbackSpeaker: () => string,
): void {
  const start = update.startSample / CAPTURE_SAMPLE_RATE;
  const end = update.endSample / CAPTURE_SAMPLE_RATE;
  const seg: Segment = {
    id: update.id,
    source,
    speaker: timeline?.speakerNear(source, start, end) ?? fallbackSpeaker(),
    text: update.text,
    start,
    end,
    final: update.final,
    words: update.words.map((w) => ({ text: w.text, start: w.start / CAPTURE_SAMPLE_RATE, end: w.end / CAPTURE_SAMPLE_RATE })),
  };
  if (!timeline) {
    upsertSegment(seg);
    return;
  }
  replaceSegmentFamily(
    seg.id,
    attributeSpeakers(
      seg,
      (a, b) => timeline.speakerNear(source, a, b),
      (a, b) => timeline.speakerFor(source, a, b),
    ),
  );
}
