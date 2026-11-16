import {
  DEFAULT_MAX_GAP_SEC,
  DEFAULT_OFF_THRESHOLD,
  DEFAULT_ON_THRESHOLD,
  DEFAULT_OVERLAP_THRESHOLD,
  DEFAULT_PAUSE_SEC,
} from './constants';
import { spanToSpeakerTurn } from './core-helpers';
import { FRAME_SEC, NUM_SPEAKERS } from './manifest';
import { AudioSpill } from './rescore/audio-spill';
import { RescoreGate } from './rescore/gate';
import { ProbsCollector } from './rescore/probs-collector';
import { rescore } from './rescore/rescore';
import { RunSpiller } from './rescore/run-spiller';
import type { Source, SpeakerTurn } from './types';
import type { SpeakerEmbedderLike } from './types/rescore';

const TURN_OPTIONS = Object.freeze({
  threshold: DEFAULT_ON_THRESHOLD,
  overlapThreshold: DEFAULT_OVERLAP_THRESHOLD,
  offThreshold: DEFAULT_OFF_THRESHOLD,
  maxGapSec: DEFAULT_MAX_GAP_SEC,
  pauseSec: DEFAULT_PAUSE_SEC,
});

function channelOf(turn: SpeakerTurn): number {
  return Number(turn.speaker.slice(turn.speaker.lastIndexOf(':') + 1));
}

export class WorkerRescore {
  private readonly collector = new ProbsCollector(NUM_SPEAKERS);
  private readonly gate = new RescoreGate();
  private readonly spiller: RunSpiller;
  private origin: number | null = null;

  constructor(
    private readonly source: Source,
    private readonly spill: AudioSpill,
  ) {
    this.spiller = new RunSpiller(spill, NUM_SPEAKERS);
  }

  static async open(id: string, source: Source): Promise<WorkerRescore | null> {
    try {
      return new WorkerRescore(source, await AudioSpill.open(`${id}-${Date.now().toString(36)}`));
    } catch {
      return null;
    }
  }

  get gateOpen(): boolean {
    return this.gate.open;
  }

  pushAudio(chunk: Float32Array, startSample?: number): void {
    if (this.origin === null) this.origin = startSample ?? 0;
    this.spiller.pushAudio(chunk);
  }

  pushProbs(probs: Float32Array): void {
    this.spiller.pushProbs(this.collector.push(probs));
  }

  observe(turn: SpeakerTurn): void {
    this.gate.observe(channelOf(turn), turn.final === true);
  }

  async run(embedder: SpeakerEmbedderLike): Promise<SpeakerTurn[] | null> {
    this.spiller.finish();
    await this.spill.flush();
    const result = await rescore({
      probs: this.collector.toFloat32(),
      numChannels: NUM_SPEAKERS,
      spill: this.spill,
      embedder,
      frameSec: FRAME_SEC,
      turnOptions: TURN_OPTIONS,
    });
    return result ? result.turns.map((span) => spanToSpeakerTurn(span, this.source, this.origin)) : null;
  }

  async discard(): Promise<void> {
    this.collector.clear();
    await this.spill.delete().catch(() => undefined);
  }
}
