/**
 * Live stage of the running D1 decide batch, shown as the Insights status row.
 *
 * In-memory only (never persisted). Read with `useSyncExternalStore`. While a
 * stage is set, a 1 s tick refreshes `now` so the elapsed seconds keep moving.
 */

import type { D1Stage } from './protocol';

export const D1_STAGE_TICK_MS = 1000;

export interface D1StageSnapshot {
  stage: D1Stage;
  /** When this stage started (ms since epoch). */
  since: number;
  /** Last tick (ms since epoch). */
  now: number;
}

let current: { stage: D1Stage; since: number } | null = null;
let snapshot: D1StageSnapshot | null = null;
const listeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function rebuildSnapshot(now: number): void {
  snapshot = current ? { stage: current.stage, since: current.since, now } : null;
}

/** Set the current stage (or clear it with `null`). Notifies listeners at once. */
export function setD1Stage(stage: D1Stage | null, at: number = Date.now()): void {
  current = stage ? { stage, since: at } : null;
  rebuildSnapshot(at);
  emit();
}

function tick(): void {
  if (!current) return;
  rebuildSnapshot(Date.now());
  emit();
}

export function subscribeD1Stage(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && tickTimer === null) {
    tickTimer = setInterval(tick, D1_STAGE_TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

export function getD1StageSnapshot(): D1StageSnapshot | null {
  return snapshot;
}

/** Elapsed whole seconds of a snapshot. */
export function d1StageElapsedSeconds(snap: D1StageSnapshot): number {
  return Math.max(0, Math.floor((snap.now - snap.since) / 1000));
}
