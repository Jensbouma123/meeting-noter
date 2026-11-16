import { RESCORE_PARAMS } from './params';

export class RescoreGate {
  private readonly seen = new Set<number>();

  constructor(private readonly threshold = RESCORE_PARAMS.gateSpeakers) {}

  observe(channel: number, final: boolean): void {
    if (final) this.seen.add(channel);
  }

  get speakers(): number {
    return this.seen.size;
  }

  get open(): boolean {
    return this.seen.size >= this.threshold;
  }
}
