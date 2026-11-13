import { tokenize } from './text';
import type { Window } from './types';

export function termCounts(windows: Window[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of windows) {
    for (const token of tokenize(w.text)) {
      if (token.length < 3) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return counts;
}
