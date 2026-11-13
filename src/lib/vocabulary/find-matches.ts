import { editDistance } from './edit-distance';
import { lettersOf } from './text-chunk';
import { soundKey } from './sound-key';
import type { Chunk, Match, Prepared } from './types';

function joinable(chunks: readonly Chunk[], from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if (!chunks[i].core) return false;
    if (i > from && chunks[i].lead) return false;
    if (i < to - 1 && chunks[i].trail) return false;
  }
  return true;
}

function sameWords(chunks: readonly Chunk[], from: number, spelling: readonly string[]): boolean {
  for (let k = 0; k < spelling.length; k++) {
    if (chunks[from + k].core.toLowerCase() !== spelling[k]) return false;
  }
  return true;
}

function matchAt(chunks: readonly Chunk[], from: number, vocab: Prepared): Match | null {
  let best: Match | null = null;
  for (const entry of vocab.entries) {
    for (const spelling of entry.spellings) {
      const to = from + spelling.length;
      if (to > chunks.length || (best && to <= best.to)) continue;
      if (!joinable(chunks, from, to) || !sameWords(chunks, from, spelling)) continue;
      if (spelling === entry.spellings[0] && !(chunks[from].lead.includes(entry.edge.lead) && chunks[to - 1].trail.includes(entry.edge.trail))) continue;
      best = { from, to, word: entry.word };
    }
  }
  if (best) return best;
  for (const entry of vocab.entries) {
    if (entry.maxEdits === 0) continue;
    const to = from + entry.size;
    if (to > chunks.length || !joinable(chunks, from, to)) continue;
    const heard = lettersOf(chunks.slice(from, to).map((c) => c.core).join(''));
    if (heard.length < 4 || soundKey(heard) !== entry.key) continue;
    if (editDistance(heard, entry.letters, entry.maxEdits) <= entry.maxEdits) return { from, to, word: entry.word };
  }
  return null;
}

export function findMatches(chunks: readonly Chunk[], vocab: Prepared): Match[] {
  const matches: Match[] = [];
  for (let i = 0; i < chunks.length; ) {
    const m = chunks[i].core ? matchAt(chunks, i, vocab) : null;
    if (m) {
      matches.push(m);
      i = m.to;
    } else {
      i += 1;
    }
  }
  return matches;
}
