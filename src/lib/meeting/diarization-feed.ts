import { activeDiarizers, heardUntil, waitingSources } from './diarization-session';
import { turnsOf } from './diarization-turns';
import type { Source } from './types';
import type { DiarizationFeed } from './types/diarization-bridge';

export function getDiarizationFeed(): Partial<Record<Source, DiarizationFeed>> {
  const out: Partial<Record<Source, DiarizationFeed>> = {};
  for (const source of ['mic', 'system'] as const) {
    const running = activeDiarizers.has(source);
    const waiting = waitingSources.has(source);
    const turnCount = turnsOf(source).length;
    if (!running && !waiting && turnCount === 0) continue;
    out[source] = { running, waiting, heardSeconds: heardUntil.get(source) ?? 0, turns: turnCount };
  }
  return out;
}
