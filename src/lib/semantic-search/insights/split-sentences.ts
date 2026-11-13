import type { Sentence } from './types/sentence';
import type { Turn } from './types/turn';

const SENTENCE = /[^.!?…]+(?:[.!?…]+["')\]]?|$)/gu;

function partAt(turn: Turn, offset: number) {
  return turn.parts.reduce((hit, p) => (p.offset <= offset ? p : hit), turn.parts[0]);
}

export function splitSentences(turns: readonly Turn[]): Sentence[] {
  const out: Sentence[] = [];
  for (const turn of turns) {
    let n = 0;
    for (const match of turn.text.matchAll(SENTENCE)) {
      const text = match[0].trim();
      if (text === '') continue;
      const lead = match[0].length - match[0].trimStart().length;
      const part = partAt(turn, (match.index ?? 0) + lead);
      out.push({ id: `${turn.parts[0].segmentId}:${n++}`, segmentId: part.segmentId, speakerId: turn.speakerId, start: part.start, text });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
