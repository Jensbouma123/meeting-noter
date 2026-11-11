/**
 * When may the on-demand server (started by Meeting Noter.app) stop itself?
 * Pure bookkeeping over browser heartbeats with an injected clock; the timer
 * and the actual exit live in `server-lifecycle.ts`.
 *
 * Each tab beats with its own client id. A tab counts as open until its
 * deadline: `staleMs` after a normal beat (background tabs get their timers
 * throttled to about once a minute), `recordingStaleMs` while it reports a
 * recording, and only `closeGraceMs` after it said it is closing, so a reload
 * or full navigation (which beats again on load) does not stop the server.
 * Before the first beat ever arrives the server never stops: a UI without the
 * heartbeat keeps the old always-on behaviour.
 */

export type IdleOptions = {
  now?: () => number;
  staleMs?: number;
  recordingStaleMs?: number;
  closeGraceMs?: number;
};

export type Beat = { recording?: boolean; closing?: boolean };

export const IDLE_DEFAULTS = {
  staleMs: 120_000,
  recordingStaleMs: 15 * 60_000,
  closeGraceMs: 15_000,
} as const;

type Client = { deadline: number; recording: boolean };

export class IdleTracker {
  private readonly now: () => number;
  private readonly staleMs: number;
  private readonly recordingStaleMs: number;
  private readonly closeGraceMs: number;
  private readonly clients = new Map<string, Client>();
  private everBeat = false;

  constructor(opts: IdleOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.staleMs = opts.staleMs ?? IDLE_DEFAULTS.staleMs;
    this.recordingStaleMs = opts.recordingStaleMs ?? IDLE_DEFAULTS.recordingStaleMs;
    this.closeGraceMs = opts.closeGraceMs ?? IDLE_DEFAULTS.closeGraceMs;
  }

  beat(clientId: string, { recording = false, closing = false }: Beat = {}): void {
    this.everBeat = true;
    const t = this.now();
    // A closing tab cannot record any more, whatever it last reported.
    const deadline = closing ? t + this.closeGraceMs : t + (recording ? this.recordingStaleMs : this.staleMs);
    this.clients.set(clientId, { deadline, recording: recording && !closing });
  }

  /** Tabs whose deadline has not passed; expired ones are forgotten. */
  private live(): Client[] {
    const t = this.now();
    for (const [id, c] of this.clients) if (c.deadline <= t) this.clients.delete(id);
    return [...this.clients.values()];
  }

  openClients(): number {
    return this.live().length;
  }

  recording(): boolean {
    return this.live().some((c) => c.recording);
  }

  /** `busy`: work outside the browser that must finish first (a running update). */
  shouldShutdown({ busy = false }: { busy?: boolean } = {}): boolean {
    if (busy || !this.everBeat) return false;
    return this.live().length === 0;
  }
}

const CLIENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Parses a heartbeat body (JSON text, as fetch and sendBeacon both send it). */
export function parseBeat(text: string): { clientId: string; beat: Beat } | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const { clientId, recording, closing } = body as Record<string, unknown>;
  if (typeof clientId !== 'string' || !CLIENT_ID.test(clientId)) return null;
  return { clientId, beat: { recording: recording === true, closing: closing === true } };
}
