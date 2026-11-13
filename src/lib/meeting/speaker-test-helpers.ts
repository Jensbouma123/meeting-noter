import type { Segment } from './types';
import type { SpeakerAt } from './types/speaker-attribution';

export function line(id: string, words: string[], at = 0, speaker = 'mic:0'): Segment {
  const timed = words.map((text, i) => ({ text, start: at + i, end: at + i + 0.8 }));
  return {
    id,
    source: 'mic',
    speaker,
    text: words.join(' '),
    start: at,
    end: at + words.length - 0.2,
    final: true,
    words: timed,
  };
}


export function turnsAt(turns: [string, number, number][]): SpeakerAt {
  return (start, end) => {
    let best: string | null = null;
    let bestTime = 0;
    for (const [speaker, a, b] of turns) {
      const t = Math.min(end, b) - Math.max(start, a);
      if (t > bestTime) {
        best = speaker;
        bestTime = t;
      }
    }
    return best;
  };
}
