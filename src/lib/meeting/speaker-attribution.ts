import type { LiveSegmentUpdate } from '@/lib/asr/types';
import type { SpeakerTimeline } from './types/asr-speaker';
import { micEchoVerdict } from './echo/segment-echo';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import { withConfirmation } from './speaker-confirmation';
import { installedOverlaps } from './speaker-overlap-timeline';
import { splitBySpeaker } from './speaker-split';
import { replaceSegmentFamily, upsertSegment } from './segment-store';
import type { Segment, Source } from './types';
import type { EchoAt, OverlapAt, SpeakerAt } from './types/speaker-attribution';

function withPieceEcho(seg: Segment, parts: Segment[], echoAt: EchoAt): Segment[] {
  if (parts.length < 2 || seg.source !== 'mic' || !seg.final) return parts;
  return parts.map((part) => {
    const echo = echoAt(part.start, part.end) ?? seg.echo;
    if (part.echo === echo) return part;
    const rest = { ...part };
    delete rest.echo;
    return echo ? { ...rest, echo } : rest;
  });
}

export function attributeSpeakers(
  seg: Segment,
  near: SpeakerAt,
  covered: SpeakerAt,
  overlaps: OverlapAt | undefined = installedOverlaps(seg.source),
  echoAt: EchoAt = micEchoVerdict,
): Segment[] {
  const parts = withPieceEcho(seg, splitBySpeaker(seg, near, covered, overlaps), echoAt);
  return withConfirmation(parts, covered);
}

export function publishLiveUpdate(
  source: Source,
  update: LiveSegmentUpdate,
  timeline: SpeakerTimeline | null,
  fallbackSpeaker: () => string,
): void {
  const start = update.startSample / CAPTURE_SAMPLE_RATE;
  const end = update.endSample / CAPTURE_SAMPLE_RATE;
  const echo = update.final && source === 'mic' ? micEchoVerdict(start, end) : undefined;
  const seg: Segment = {
    id: update.id,
    source,
    speaker: timeline?.speakerNear(source, start, end) ?? fallbackSpeaker(),
    text: update.text,
    start,
    end,
    final: update.final,
    words: update.words.map((w) => ({
      text: w.text,
      start: w.start / CAPTURE_SAMPLE_RATE,
      end: w.end / CAPTURE_SAMPLE_RATE,
    })),
    ...(echo ? { echo } : {}),
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
