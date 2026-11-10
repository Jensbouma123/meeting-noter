/**
 * Which captured audio is speech, before any of it reaches the model, and
 * which recognised text is not worth showing after it. Pure, like the chunker
 * that uses it (`live-chunker.ts`).
 *
 * Parakeet is trained on speech. Handed a mouse click, a key press, a breath
 * or a "hmm", it still decodes *something*: a letter or two, "Hm.", "Amen.".
 * Loudness alone cannot tell those apart from a word, and a level learnt from
 * the room takes most of a minute to settle, so until then room tone passed
 * for speech as well. So a frame is speech only when it is loud for the room
 * *and* voiced: periodic at a pitch a voice has, in the band a voice puts its
 * energy in. Clicks and keys are too short to repeat, breath and rustle have
 * no pitch, and a hum from the mains is learnt by the noise floor. An
 * utterance opens only after ~300 ms of that, so a lone click never opens one,
 * and whatever still comes back as filler or noise is dropped by
 * `isNoiseText` rather than shown.
 *
 * A Silero-style VAD would be the next step up, but it is another model to
 * download and run per frame on the main thread; this costs a few hundred
 * thousand multiply-adds per second of audio.
 */

export const SPEECH_GATE_SAMPLE_RATE = 16_000;

const SR = SPEECH_GATE_SAMPLE_RATE;
/** Analysis frame: 30 ms at 16 kHz, long enough for two periods of an 80 Hz voice. */
const SUB = 480;
/** The voicing check runs on audio decimated to 8 kHz. */
const DECIMATE = 2;
const DSR = SR / DECIMATE;
/** Pitch search range: 400 Hz … 80 Hz, as lags at 8 kHz. */
const MIN_LAG = Math.round(DSR / 400);
const MAX_LAG = Math.round(DSR / 80);
/** One-pole low-pass coefficient for ~1 kHz at 16 kHz (applied twice): the
 *  pitch and first formant, not the hiss and clicks above them. */
const LOWPASS = 1 - Math.exp((-2 * Math.PI * 1000) / SR);

export interface SpeechGateConfig {
  /** Frame RMS below this is never speech (Float32, full scale 1). */
  minSpeechRms: number;
  /** A frame this far above the noise floor is loud enough to be speech. */
  speechOverFloor: number;
  /** An analysis frame this far above the noise floor may be voiced speech
   *  (lower than `speechOverFloor`: periodicity, not level, decides). */
  voicedOverFloor: number;
  /** A frame below this multiple of the noise floor is quiet. */
  quietOverFloor: number;
  /** Normalised autocorrelation at the best pitch lag that counts as voiced. */
  minVoicing: number;
  /** Share of an analysis frame's energy that must sit below ~1 kHz. */
  minLowBandShare: number;
  /** Energy of an analysis frame's quietest third over its loudest (`steadiness`). */
  minSteadiness: number;
  /** Voiced audio needed before an utterance opens. */
  minSpeechSamples: number;
  /** A gap in voicing this long ends a run that has not opened yet. */
  maxSpeechGapSamples: number;
  /** A result whose words average below this confidence is noise. */
  minWordConfidence: number;
  /** The same, for a result of one word that is not a common reply
   *  (`REPLIES`): what the model makes of a hum. */
  minLoneWordConfidence: number;
}

export const DEFAULT_SPEECH_GATE_CONFIG: Readonly<SpeechGateConfig> = Object.freeze({
  // On the AMI bench (far-field, quiet talkers) a 0.0015 minimum and a 3x
  // floor for voicing kept only 71 % of the labelled speech open and lost
  // whole phrases; periodicity keeps the room out, so the level can be low.
  minSpeechRms: 0.001,
  speechOverFloor: 3,
  voicedOverFloor: 2,
  quietOverFloor: 2,
  minVoicing: 0.5,
  minLowBandShare: 0.3,
  // Kills fast typing (10 keys/s) at a 0.02 threshold already; keeps 98 % of
  // the AMI bench's speech frames, where 0.2 lost 13 %.
  minSteadiness: 0.05,
  minSpeechSamples: 0.3 * SR,
  maxSpeechGapSamples: 0.3 * SR,
  minWordConfidence: 0.5,
  // A hummed "mm" comes back as "Amen." at 0.56 … 0.62; a lone "Otherwise."
  // or "Screenshots." on the AMI bench scores 0.76 … 0.9, a lone "Yeah." as
  // little as 0.52, so replies are exempt.
  minLoneWordConfidence: 0.7,
});

/** What the gate made of one pushed frame. */
export interface GateFrame {
  /** Frame RMS. */
  level: number;
  /** Loud for the room (the old, level-only notion of "voiced"). */
  loud: boolean;
  /** Below the pause level. */
  quiet: boolean;
  /** Holds voiced speech (any analysis frame in it). */
  voiced: boolean;
  /** Part of a run that has reached the minimum speech duration. */
  speech: boolean;
  /** Samples, up to the end of this frame, since the current voiced run
   *  began (0 when there is none): audio to keep while the run may still
   *  turn out to be speech. */
  runSamples: number;
}

/** The noise floor rises this much per second while nothing is quieter, so
 *  a steady hum is learnt within a minute or so, never one sentence. */
const FLOOR_RISE_PER_SECOND = 1.015;

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/**
 * How periodic `x` is at a voice's pitch: the best normalised
 * autocorrelation over lags `MIN_LAG … MAX_LAG`. 1 is a perfect repeat;
 * noise and single transients stay near 0.
 */
export function voicing(x: Float32Array): number {
  const n = x.length;
  if (n <= MAX_LAG * 2) return 0;
  // Energy prefix sums, so each lag's normaliser is O(1).
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) pre[i + 1] = pre[i] + x[i] * x[i];
  if (pre[n] <= 0) return 0;
  let best = 0;
  for (let lag = MIN_LAG; lag <= MAX_LAG; lag += 1) {
    let dot = 0;
    for (let i = 0; i + lag < n; i += 1) dot += x[i] * x[i + lag];
    if (dot <= 0) continue;
    const norm = Math.sqrt((pre[n - lag] - pre[0]) * (pre[n] - pre[lag]));
    if (norm > 0 && dot / norm > best) best = dot / norm;
  }
  return best;
}

/** Blocks an analysis frame is split into to judge whether its level holds. */
const STEADY_BLOCKS = 3;

/**
 * How evenly `x`'s energy spreads over its thirds: the quietest third's
 * energy over the loudest's. Near 1 for a held vowel, near 0 for a transient.
 */
export function steadiness(x: Float32Array): number {
  const len = Math.floor(x.length / STEADY_BLOCKS);
  let lo = Infinity;
  let hi = 0;
  for (let b = 0; b < STEADY_BLOCKS; b += 1) {
    let e = 0;
    for (let i = b * len; i < (b + 1) * len; i += 1) e += x[i] * x[i];
    lo = Math.min(lo, e);
    hi = Math.max(hi, e);
  }
  return hi > 0 ? lo / hi : 0;
}

/** One source's speech detector. Feed it every captured frame, in order. */
export class SpeechGate {
  private readonly cfg: SpeechGateConfig;
  private floor: number;
  /** Samples not yet analysed (less than one analysis frame). */
  private carry = new Float32Array(SUB);
  private carryLen = 0;
  /** Low-pass filter state. */
  private lp1 = 0;
  private lp2 = 0;
  private dc = 0;
  /** The current voiced run: voiced samples in it, the gap since its last
   *  voiced frame, and how many samples ago it began. */
  private runVoiced = 0;
  private runGap = 0;
  private runAge = 0;
  private inRun = false;
  private open = false;

  constructor(cfg: Partial<SpeechGateConfig> = {}) {
    this.cfg = { ...DEFAULT_SPEECH_GATE_CONFIG, ...cfg };
    this.floor = this.cfg.minSpeechRms / 3;
  }

  /** The source's current background level (frame RMS). */
  get noiseFloor(): number {
    return this.floor;
  }

  /** Classify one captured frame. */
  push(samples: Float32Array): GateFrame {
    const level = rms(samples);
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
      const frameVoiced = this.analyse(this.carry, voicedAt);
      this.carryLen = 0;
      voiced ||= frameVoiced;
      speech ||= this.advanceRun(frameVoiced);
    }
    // Samples still in `carry` belong to the run (if any) but are not analysed.
    const runSamples = this.inRun ? this.runAge + this.carryLen : 0;

    // Falls fast to anything quieter, rises slowly otherwise.
    this.floor =
      level < this.floor
        ? this.floor + (level - this.floor) * 0.3
        : this.floor * Math.pow(FLOOR_RISE_PER_SECOND, samples.length / SR);
    this.floor = Math.max(this.floor, 1e-5);

    return { level, loud, quiet, voiced, speech: speech || (this.open && voiced), runSamples };
  }

  /** Forget everything (a new recording). */
  reset(): void {
    this.floor = this.cfg.minSpeechRms / 3;
    this.carryLen = 0;
    this.lp1 = 0;
    this.lp2 = 0;
    this.dc = 0;
    this.endRun();
  }

  /* ---------------------------------------------------------------- */

  /** Whether one analysis frame is voiced speech, loud for the room. */
  private analyse(frame: Float32Array, loudAt: number): boolean {
    const low = new Float32Array(SUB / DECIMATE);
    let total = 0;
    let lowEnergy = 0;
    for (let i = 0; i < SUB; i += 1) {
      // DC blocker, then two one-pole low-passes (~1 kHz).
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
    // A key's thump rings at a voice's pitch too, but dies within ~10 ms,
    // where a vowel holds its level across the whole frame.
    if (steadiness(low) < this.cfg.minSteadiness) return false;
    return voicing(low) >= this.cfg.minVoicing;
  }

  /** Account for one analysis frame; returns whether it is part of an
   *  utterance-worthy run of speech. */
  private advanceRun(frameVoiced: boolean): boolean {
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

/** Sounds people make that are not words, in the languages we transcribe. */
const FILLERS = new Set([
  'ah', 'ahm', 'eh', 'ehm', 'er', 'erm', 'hm', 'hmm', 'mhm', 'mm', 'mm-hmm', 'uh', 'uhm', 'um', 'umm',
]);

/** One-word replies people really give, which the model is often unsure of. */
const REPLIES = new Set([
  'yeah', 'yes', 'yep', 'yup', 'no', 'nope', 'okay', 'ok', 'right', 'sure', 'exactly', 'cool', 'alright', 'thanks',
  'ja', 'nee', 'oké', 'precies', 'klopt', 'prima',
]);

function bare(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '').replace(/^[-']+|[-']+$/g, '');
}

/** Whether a word is filler ("hmm", "uh") rather than a word. */
export function isFiller(text: string): boolean {
  const w = bare(text);
  return FILLERS.has(w) || /^(h?m+(h?m+)*|u+h+m*|e+h+m*)$/.test(w);
}

export type NoiseTextConfig = Pick<SpeechGateConfig, 'minWordConfidence' | 'minLoneWordConfidence'>;

/**
 * Whether recognised words are noise rather than speech: fewer than two
 * letters or digits in all, nothing but single letters and filler, or (when
 * the model reports it) a low average confidence, stricter for a lone word.
 */
export function isNoiseText(
  words: readonly { text: string; confidence?: number }[],
  cfg: NoiseTextConfig = DEFAULT_SPEECH_GATE_CONFIG,
): boolean {
  const bares = words.map((w) => bare(w.text)).filter(Boolean);
  const chars = bares.join('').replace(/[^\p{L}\p{N}]/gu, '').length;
  if (chars < 2) return true;
  if (bares.every((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length <= 1 || isFiller(w))) return true;
  const confs = words.map((w) => w.confidence).filter((c): c is number => typeof c === 'number');
  if (confs.length === words.length && confs.length > 0) {
    const mean = confs.reduce((a, b) => a + b, 0) / confs.length;
    const lone = bares.length === 1 && !REPLIES.has(bares[0]);
    if (mean < (lone ? cfg.minLoneWordConfidence : cfg.minWordConfidence)) return true;
  }
  return false;
}
