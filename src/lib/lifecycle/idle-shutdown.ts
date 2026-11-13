import { IDLE_DEFAULTS } from './constants';
import type { Beat, Client, IdleOptions } from './types';

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
    const deadline = closing ? t + this.closeGraceMs : t + (recording ? this.recordingStaleMs : this.staleMs);
    this.clients.set(clientId, { deadline, recording: recording && !closing });
  }

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

  shouldShutdown({ busy = false }: { busy?: boolean } = {}): boolean {
    if (busy || !this.everBeat) return false;
    return this.live().length === 0;
  }
}
