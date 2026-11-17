import type { Segment, Speaker } from './types';
import type { AutosaveInput, AutosavedSession } from './types/autosave';
import type { TrackedTranscript } from './types/tracked-transcript';

const tracked = new Map<string, TrackedTranscript>();

function finals(segments: Segment[] | undefined): Segment[] {
  return Array.isArray(segments) ? segments.filter((s) => s && s.final === true) : [];
}

function sameRefs<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

function sameSpeakers(a: Record<string, Speaker>, b: Record<string, Speaker>): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

function matchesStored(previous: AutosavedSession | null, input: AutosaveInput): boolean {
  if (!previous) return false;
  return (
    JSON.stringify([previous.segments, previous.speakers]) ===
    JSON.stringify([
      finals(input.segments).map((s) => (s.words ? { ...s, words: undefined } : s)),
      input.speakers ?? {},
    ])
  );
}

export function transcriptChanged(input: AutosaveInput, loadPrevious: () => AutosavedSession | null): boolean {
  const known = tracked.get(input.sessionId);
  if (!known) return !matchesStored(loadPrevious(), input);
  return !sameRefs(known.segments, finals(input.segments)) || !sameSpeakers(known.speakers, input.speakers ?? {});
}

export function recordTranscript(input: AutosaveInput, changed: boolean): void {
  const revision = (tracked.get(input.sessionId)?.revision ?? 0) + (changed ? 1 : 0);
  tracked.set(input.sessionId, {
    segments: finals(input.segments),
    speakers: input.speakers ?? {},
    revision,
  });
}

export function transcriptRevision(sessionId: string): number {
  return tracked.get(sessionId)?.revision ?? 0;
}

export function invalidateTranscriptRevision(sessionId: string): void {
  tracked.delete(sessionId);
}
