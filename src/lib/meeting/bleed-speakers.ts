import { turnsOf, turnsRevision } from './diarization-turns';

const BLEED_SYSTEM_SHARE = 0.7;

let cached: { revision: number; speakers: ReadonlySet<string> } | null = null;

function systemSpans(): [number, number][] {
  const merged: [number, number][] = [];
  for (const t of turnsOf('system')) {
    const last = merged[merged.length - 1];
    if (last && t.start <= last[1]) last[1] = Math.max(last[1], t.end);
    else merged.push([t.start, t.end]);
  }
  return merged;
}

function overlapWith(spans: readonly [number, number][], start: number, end: number): number {
  let lo = 0;
  let hi = spans.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (spans[mid][1] <= start) lo = mid + 1;
    else hi = mid;
  }
  let total = 0;
  for (let i = lo; i < spans.length && spans[i][0] < end; i += 1) {
    total += Math.min(end, spans[i][1]) - Math.max(start, spans[i][0]);
  }
  return total;
}

function computeBleedSpeakers(): ReadonlySet<string> {
  const spans = systemSpans();
  const total = new Map<string, number>();
  const shared = new Map<string, number>();
  for (const t of turnsOf('mic')) {
    total.set(t.speaker, (total.get(t.speaker) ?? 0) + t.end - t.start);
    shared.set(t.speaker, (shared.get(t.speaker) ?? 0) + overlapWith(spans, t.start, t.end));
  }
  const bleed = new Set<string>();
  for (const [speaker, time] of total) {
    if (time > 0 && shared.get(speaker)! / time >= BLEED_SYSTEM_SHARE) bleed.add(speaker);
  }
  return bleed;
}

export function micBleedSpeakers(): ReadonlySet<string> {
  const revision = turnsRevision();
  if (cached?.revision !== revision) cached = { revision, speakers: computeBleedSpeakers() };
  return cached.speakers;
}

export function withoutBleedSpeakers(speakers: readonly string[]): readonly string[] {
  const bleed = micBleedSpeakers();
  const real = speakers.filter((s) => !bleed.has(s));
  return real.length > 0 ? real : speakers;
}
