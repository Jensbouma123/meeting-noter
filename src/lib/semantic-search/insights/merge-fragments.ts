import type { Segment } from '@/lib/meeting/types';
import type { Turn } from './types/turn';

const TERMINAL = /[.!?…]["')\]]?$/u;
const MAX_GAP_S = 2.5;

export function mergeFragments(segments: readonly Segment[]): Turn[] {
  const finals = segments.filter((s) => s.final && s.text.trim() !== '').sort((a, b) => a.start - b.start);
  const turns: Turn[] = [];
  for (const seg of finals) {
    const text = seg.text.trim();
    const last = turns.at(-1);
    const joinable = last && last.speakerId === seg.speaker && !TERMINAL.test(last.text) && seg.start - last.end <= MAX_GAP_S;
    if (last && joinable) {
      last.parts.push({ segmentId: seg.id, start: seg.start, offset: last.text.length + 1 });
      last.text = `${last.text} ${text}`;
      last.end = Math.max(last.end, seg.end);
      continue;
    }
    turns.push({ speakerId: seg.speaker, text, end: seg.end, parts: [{ segmentId: seg.id, start: seg.start, offset: 0 }] });
  }
  return turns;
}
