import { getState } from './store-core';
import type { Segment } from './types';
import type { ActiveAppend } from './types/append-mode';

let pendingAppend = false;
let activeAppend: ActiveAppend | null = null;
let appendEpoch = 0;

function transcriptEnd(segments: Segment[]): number {
  let end = 0;
  for (const s of segments) if (s.end > end) end = s.end;
  return end;
}

export function armAppend(): boolean {
  if (getState().segments.length === 0) return false;
  pendingAppend = true;
  return true;
}

export function cancelAppend(): void {
  pendingAppend = false;
  activeAppend = null;
}

export function clearPendingAppend(): void {
  pendingAppend = false;
}

export function isAppendActive(): boolean {
  return pendingAppend || activeAppend !== null;
}

export function getActiveAppend(): ActiveAppend | null {
  return activeAppend;
}

export function activateStagedAppend(segments: Segment[]): boolean {
  const keep = pendingAppend && segments.length > 0;
  pendingAppend = false;
  activeAppend = keep ? { offset: transcriptEnd(segments), prefix: `a${++appendEpoch}:` } : null;
  return keep;
}

export function captureSpanOf(seg: Segment): { start: number; end: number } | null {
  if (!activeAppend) return { start: seg.start, end: seg.end };
  if (!seg.id.startsWith(activeAppend.prefix)) return null;
  return { start: seg.start - activeAppend.offset, end: seg.end - activeAppend.offset };
}
