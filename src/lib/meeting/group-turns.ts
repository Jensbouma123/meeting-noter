import { splitTranscript } from './split-transcript';
import { finalSegments, resolveSpeakerLabel, tidyText } from './transcript-format';
import type { Segment, Speaker } from './types';
import type { Turn } from './types/export';

export function groupTurns(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  callAudioMissing = false,
): Turn[] {
  const tidy = finalSegments(segments)
    .map((seg) => ({ ...seg, text: tidyText(seg.text) }))
    .filter((seg) => seg.text.length > 0);
  const label = (seg: Segment) => resolveSpeakerLabel(seg, speakers, callAudioMissing);
  return splitTranscript(tidy).map((block): Turn => {
    const segs = block.segments;
    const turn: Turn = {
      speaker: segs[0].speaker,
      label: label(segs[0]),
      start: segs[0].start,
      end: segs.reduce((m, seg) => Math.max(m, seg.end, seg.start), 0),
      lines: segs.map((seg) => ({ start: seg.start, end: seg.end, text: seg.text })),
    };
    if (block.kind === 'turn') return turn;
    const labels = block.speakers.map((id) => label({ ...(segs.find((seg) => seg.speaker === id) ?? segs[0]), speaker: id }));
    return {
      ...turn,
      label: labels.join(' + '),
      lines: segs.map((seg) => ({ start: seg.start, end: seg.end, text: seg.text, label: label(seg) })),
      overlap: { labels },
    };
  });
}
