import {
  ANALYSIS_FRAME_SAMPLES as SUB,
  DECIMATE,
  FLOOR_RISE_PER_SECOND,
  LOWPASS_COEFFICIENT as LOWPASS,
  SPEECH_GATE_SAMPLE_RATE as SR,
} from './speech-gate-constants';
import { DEFAULT_SPEECH_GATE_CONFIG } from './speech-gate-defaults';
import type { GateFrame, SpeechGateConfig } from './types';
import { steadiness, voicing } from './voicing';

function frameRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

export class SpeechGate {
  private readonly cfg: SpeechGateConfig;
  private floor: number;
  private carry = new Float32Array(SUB);
  private carryLen = 0;
  private lp1 = 0;
  private lp2 = 0;
  private dc = 0;
  private runVoiced = 0;
  private runGap = 0;
  private runAge = 0;
  private inRun = false;
  private open = false;

  constructor(cfg: Partial<SpeechGateConfig> = {}) {
    this.cfg = { ...DEFAULT_SPEECH_GATE_CONFIG, ...cfg };
    this.floor = this.cfg.minSpeechRms / 3;
  }

  get noiseFloor(): number {
    return this.floor;
  }

  push(samples: Float32Array): GateFrame {
    const level = frameRms(samples);
    const loudAt = Math.max(this.cfg.minSpeechRms, this.floor * this.cfg.speechOverFloor);
    const loud = level >= loudAt;
    const voicedAt = Math.max(this.cfg.minSpeechRms, this.floor * this.cfg.voicedOverFloor);
    const quiet = level < Math.max(this.cfg.minSpeechRms, this.floor * this.cfg.quietOverFloor);

    let voiced = false;
    let speech = false;
    let offset = 0;
    while (offset < samples.length) {
      const take = Math.min(SUB - this.carryLen, samples.length - offset);
      this.carry.set(samples.subarray(offset, offset + take), this.carryLen);
      this.carryLen += take;
      offset += take;
      if (this.carryLen < SUB) break;
      const frameVoiced = this.isVoicedFrame(this.carry, voicedAt);
      this.carryLen = 0;
      voiced ||= frameVoiced;
      speech ||= this.advanceVoicedRun(frameVoiced);
    }
    const runSamples = this.inRun ? this.runAge + this.carryLen : 0;

    this.floor =
      level < this.floor
        ? this.floor + (level - this.floor) * 0.3
        : this.floor * Math.pow(FLOOR_RISE_PER_SECOND, samples.length / SR);
    this.floor = Math.max(this.floor, 1e-5);

    return { level, loud, quiet, voiced, speech: speech || (this.open && voiced), runSamples };
  }

  reset(): void {
    this.floor = this.cfg.minSpeechRms / 3;
    this.carryLen = 0;
    this.lp1 = 0;
    this.lp2 = 0;
    this.dc = 0;
    this.endRun();
  }

  private isVoicedFrame(frame: Float32Array, loudAt: number): boolean {
    const low = new Float32Array(SUB / DECIMATE);
    let total = 0;
    let lowEnergy = 0;
    for (let i = 0; i < SUB; i += 1) {
      this.dc += (frame[i] - this.dc) * 0.005;
      const x = frame[i] - this.dc;
      this.lp1 += (x - this.lp1) * LOWPASS;
      this.lp2 += (this.lp1 - this.lp2) * LOWPASS;
      total += x * x;
      lowEnergy += this.lp2 * this.lp2;
      if (i % DECIMATE === 0) low[i / DECIMATE] = this.lp2;
    }
    if (Math.sqrt(total / SUB) < loudAt) return false;
    if (lowEnergy < total * this.cfg.minLowBandShare) return false;
    if (steadiness(low) < this.cfg.minSteadiness) return false;
    return voicing(low) >= this.cfg.minVoicing;
  }

  private advanceVoicedRun(frameVoiced: boolean): boolean {
    if (frameVoiced) {
      if (!this.inRun) {
        this.inRun = true;
        this.runAge = 0;
        this.runVoiced = 0;
      }
      this.runVoiced += SUB;
      this.runGap = 0;
      this.runAge += SUB;
      if (this.runVoiced >= this.cfg.minSpeechSamples) this.open = true;
      return this.open;
    }
    if (!this.inRun) return false;
    this.runGap += SUB;
    this.runAge += SUB;
    if (this.runGap > this.cfg.maxSpeechGapSamples) this.endRun();
    return false;
  }

  private endRun(): void {
    this.inRun = false;
    this.open = false;
    this.runVoiced = 0;
    this.runGap = 0;
    this.runAge = 0;
  }
}
