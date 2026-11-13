import type { BrowserWord } from './types';
import type { ContextBiaser } from '../../vocabulary/bias';

export const NEMOTRON = Object.freeze({
  sampleRate: 16000,
  nMels: 128,
  nFft: 512,
  hop: 160,
  win: 400,
  preemph: 0.97,
  logEps: 2 ** -24,

  chunkSamples: 8960,
  melFramesPerChunk: 56,
  preEncodeCache: 9,
  layers: 24,
  hidden: 1024,
  leftContext: 56,
  convContext: 8,
  predLayers: 2,
  predHidden: 640,
  vocabSize: 13088,
  blankId: 13087,
  maxSymbolsPerStep: 10,

  frameSeconds: 0.08,
});

export const NEMOTRON_LANG_IDS: Readonly<Record<string, number>> = Object.freeze({
  en: 0,
  'en-US': 0,
  'en-GB': 1,
  es: 3,
  fr: 8,
  de: 9,
  it: 15,
  nl: 16,
  pt: 13,
  auto: 101,
});

export function nemotronLangId(language: string | undefined): number {
  if (!language) return NEMOTRON_LANG_IDS.auto;
  return NEMOTRON_LANG_IDS[language] ?? NEMOTRON_LANG_IDS[language.split('-')[0]] ?? NEMOTRON_LANG_IDS.auto;
}

function slaneyFilterbank(): { start: Int32Array; weights: Float32Array[] } {
  const { nMels, nFft, sampleRate } = NEMOTRON;
  const bins = nFft / 2 + 1;
  const minLogHz = 1000;
  const minLogMel = 15;
  const linScale = 200 / 3;
  const logStep = Math.log(6.4) / 27;
  const hzToMel = (hz: number) => (hz < minLogHz ? hz / linScale : minLogMel + Math.log(hz / minLogHz) / logStep);
  const melToHz = (mel: number) => (mel < minLogMel ? mel * linScale : minLogHz * Math.exp((mel - minLogMel) * logStep));
  const lo = hzToMel(0);
  const hi = hzToMel(sampleRate / 2);
  const f = Array.from({ length: nMels + 2 }, (_, i) => melToHz(lo + ((hi - lo) * i) / (nMels + 1)));
  const start = new Int32Array(nMels);
  const weights: Float32Array[] = [];
  for (let m = 0; m < nMels; m++) {
    const row = new Float32Array(bins);
    const enorm = 2 / (f[m + 2] - f[m] + 1e-10);
    for (let k = 0; k < bins; k++) {
      const hz = (k * sampleRate) / nFft;
      const lower = (hz - f[m]) / (f[m + 1] - f[m] + 1e-10);
      const upper = (f[m + 2] - hz) / (f[m + 2] - f[m + 1] + 1e-10);
      row[k] = Math.max(0, Math.min(lower, upper)) * enorm;
    }
    let a = 0;
    while (a < bins - 1 && row[a] === 0) a++;
    let b = bins;
    while (b > a + 1 && row[b - 1] === 0) b--;
    start[m] = a;
    weights.push(row.slice(a, b));
  }
  return { start, weights };
}

function makePowerSpectrum(n: number): (frame: Float32Array, out: Float32Array) => void {
  const levels = Math.log2(n);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b);
    rev[i] = r;
  }
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = -Math.sin((2 * Math.PI * i) / n);
  }
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  return (frame, out) => {
    for (let i = 0; i < n; i++) {
      re[rev[i]] = frame[i];
      im[rev[i]] = 0;
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < half; j++) {
          const k = j * step;
          const a = i + j;
          const b = a + half;
          const tr = re[b] * cos[k] - im[b] * sin[k];
          const ti = re[b] * sin[k] + im[b] * cos[k];
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    for (let k = 0; k < out.length; k++) out[k] = re[k] * re[k] + im[k] * im[k];
  };
}

export class NemotronMelStream {
  private readonly fb = slaneyFilterbank();
  private readonly window: Float32Array;
  private readonly power = makePowerSpectrum(NEMOTRON.nFft);
  private overlap = new Float32Array(NEMOTRON.nFft / 2);
  private lastSample = 0;

  constructor() {
    const { win } = NEMOTRON;
    this.window = new Float32Array(win);
    for (let n = 0; n < win; n++) this.window[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (win - 1));
  }

  reset(): void {
    this.overlap = new Float32Array(NEMOTRON.nFft / 2);
    this.lastSample = 0;
  }

  process(chunk: Float32Array): { mel: Float32Array; frames: number } {
    const { nFft, hop, win, nMels, preemph, logEps } = NEMOTRON;
    const pad = nFft / 2;
    const winOffset = (nFft - win) / 2;
    const n = chunk.length;
    const padded = new Float32Array(pad + n + winOffset);
    padded.set(this.overlap, 0);
    let prev = this.lastSample;
    for (let i = 0; i < n; i++) {
      padded[pad + i] = chunk[i] - preemph * prev;
      prev = chunk[i];
    }
    this.lastSample = n > 0 ? chunk[n - 1] : this.lastSample;
    this.overlap = padded.slice(n, n + pad);

    const frames = Math.floor((padded.length - winOffset - win) / hop) + 1;
    const mel = new Float32Array(frames * nMels);
    const frame = new Float32Array(nFft);
    const spec = new Float32Array(nFft / 2 + 1);
    for (let t = 0; t < frames; t++) {
      const base = t * hop + winOffset;
      for (let i = 0; i < win; i++) frame[i] = padded[base + i] * this.window[i];
      frame.fill(0, win);
      this.power(frame, spec);
      for (let m = 0; m < nMels; m++) {
        const w = this.fb.weights[m];
        const s = this.fb.start[m];
        let v = 0;
        for (let k = 0; k < w.length; k++) v += w[k] * spec[s + k];
        mel[t * nMels + m] = Math.log(v + logEps);
      }
    }
    return { mel, frames };
  }
}

export interface OrtTensorLike {
  readonly data: unknown;
  readonly dims: readonly number[];
  dispose?: () => void;
}

export interface OrtLike {
  Tensor: new (
    type: 'float32' | 'int64',
    data: Float32Array | BigInt64Array,
    dims: readonly number[],
  ) => OrtTensorLike;
}

export interface SessionLike {
  run(feeds: Record<string, OrtTensorLike>): Promise<Record<string, OrtTensorLike>>;
}

export interface NemotronSessions {
  encoder: SessionLike;
  decoder: SessionLike;
  joint: SessionLike;
}

export interface NemotronToken {
  id: number;
  frame: number;
  logProb: number;
}

export interface NemotronResult {
  text: string;
  words: BrowserWord[];
  tokens: NemotronToken[];

  firstTokenMs: number | null;
}

export function parseNemotronVocab(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((l) => l.replace(/\r$/, ''));
}

function isSpecialPiece(piece: string): boolean {
  return piece.length > 2 && piece.startsWith('<') && piece.endsWith('>');
}

export function tokensToWords(
  tokens: readonly NemotronToken[],
  vocab: readonly string[],
  offsetSeconds = 0,
): BrowserWord[] {
  const words: BrowserWord[] = [];
  let text = '';
  let first = 0;
  let last = 0;
  let probSum = 0;
  let count = 0;
  const flush = () => {
    const trimmed = text.trim();
    if (trimmed) {
      const start = Math.max(0, first * NEMOTRON.frameSeconds - offsetSeconds);
      words.push({
        text: trimmed,
        start,
        end: Math.max(start, (last + 1) * NEMOTRON.frameSeconds - offsetSeconds),
        confidence: probSum / count,
      });
    }
    text = '';
    probSum = 0;
    count = 0;
  };
  for (const tok of tokens) {
    const piece = vocab[tok.id] ?? '';
    if (!piece || isSpecialPiece(piece)) continue;
    const boundary = piece.startsWith('▁');
    if (boundary && count > 0) flush();
    if (count === 0) first = tok.frame;
    text += boundary ? piece.slice(1) : piece;
    last = tok.frame;
    probSum += Math.exp(tok.logProb);
    count += 1;
  }
  if (count > 0) flush();
  return words;
}

export const NEMOTRON_EMISSION_LEAD_S = 4 * NEMOTRON.frameSeconds;

export interface NemotronRecognizeOptions {

  langId?: number;

  flushChunks?: number;

  leadSeconds?: number;

  onChunk?: (index: number, total: number) => void;

  biaser?: ContextBiaser | null;
}

export class NemotronRecognizer {
  private readonly ort: OrtLike;
  private readonly sessions: NemotronSessions;
  private readonly vocab: readonly string[];

  constructor(ort: OrtLike, sessions: NemotronSessions, vocab: readonly string[]) {
    this.ort = ort;
    this.sessions = sessions;
    this.vocab = vocab;
  }

  get pieces(): readonly string[] {
    return this.vocab;
  }

  async recognize(audio: Float32Array, options: NemotronRecognizeOptions = {}): Promise<NemotronResult> {
    const startedAt = Date.now();
    const langId = options.langId ?? NEMOTRON_LANG_IDS.en;
    const flushChunks = options.flushChunks ?? 1;
    const lead = options.leadSeconds ?? NEMOTRON_EMISSION_LEAD_S;
    const { chunkSamples, nMels, preEncodeCache, melFramesPerChunk, layers, hidden, leftContext, convContext } =
      NEMOTRON;

    const tokens: NemotronToken[] = [];
    let firstTokenMs: number | null = null;
    if (audio.length === 0) return { text: '', words: [], tokens, firstTokenMs };

    const { Tensor } = this.ort;
    const mel = new NemotronMelStream();
    const melCache = new Float32Array(preEncodeCache * nMels);
    let cacheChannel: OrtTensorLike = new Tensor(
      'float32',
      new Float32Array(layers * leftContext * hidden),
      [1, layers, leftContext, hidden],
    );
    let cacheTime: OrtTensorLike = new Tensor(
      'float32',
      new Float32Array(layers * hidden * convContext),
      [1, layers, hidden, convContext],
    );
    let cacheLen: OrtTensorLike = new Tensor('int64', new BigInt64Array(1), [1]);
    const lang = new Tensor('int64', BigInt64Array.from([BigInt(langId)]), [1]);
    const length = new Tensor('int64', BigInt64Array.from([BigInt(preEncodeCache + melFramesPerChunk)]), [1]);
    const decoder = new PredictionState(this.ort, this.sessions.decoder);
    const biaser = options.biaser ?? null;
    biaser?.reset();

    const audioChunks = Math.ceil(audio.length / chunkSamples);
    const total = audioChunks + flushChunks;
    const signal = new Float32Array((preEncodeCache + melFramesPerChunk) * nMels);
    let frameBase = 0;

    for (let c = 0; c < total; c++) {
      const chunk = new Float32Array(chunkSamples);
      if (c < audioChunks) chunk.set(audio.subarray(c * chunkSamples, Math.min(audio.length, (c + 1) * chunkSamples)));
      const { mel: frames, frames: count } = mel.process(chunk);
      if (count !== melFramesPerChunk) throw new Error(`Nemotron frontend produced ${count} frames, expected ${melFramesPerChunk}`);
      signal.set(melCache, 0);
      signal.set(frames, melCache.length);
      melCache.set(frames.subarray((count - preEncodeCache) * nMels));

      const out = await this.sessions.encoder.run({
        audio_signal: new Tensor('float32', signal, [1, preEncodeCache + count, nMels]),
        length,
        cache_last_channel: cacheChannel,
        cache_last_time: cacheTime,
        cache_last_channel_len: cacheLen,
        lang_id: lang,
      });
      cacheChannel.dispose?.();
      cacheTime.dispose?.();
      cacheChannel = out.cache_last_channel_next;
      cacheTime = out.cache_last_time_next;
      cacheLen = out.cache_last_channel_len_next;
      const enc = out.outputs;
      const encLen = Math.min(enc.dims[1], Number((out.encoded_lengths.data as BigInt64Array)[0]));
      const emitted = await greedyDecodeChunk(
        this.ort,
        this.sessions.joint,
        decoder,
        enc.data as Float32Array,
        encLen,
        frameBase,
        biaser,
      );
      enc.dispose?.();
      for (const tok of emitted) {
        if (firstTokenMs === null && !isSpecialPiece(this.vocab[tok.id] ?? '<>')) firstTokenMs = Date.now() - startedAt;
        tokens.push(tok);
      }
      frameBase += encLen;
      options.onChunk?.(c, total);
    }
    cacheChannel.dispose?.();
    cacheTime.dispose?.();
    decoder.dispose();

    const words = tokensToWords(tokens, this.vocab, lead);
    return { text: words.map((w) => w.text).join(' '), words, tokens, firstTokenMs };
  }
}

class PredictionState {
  private h: OrtTensorLike;
  private c: OrtTensorLike;
  private lastToken: number = NEMOTRON.blankId;

  private pending: { out: Float32Array; h: OrtTensorLike; c: OrtTensorLike } | null = null;
  private readonly ort: OrtLike;
  private readonly session: SessionLike;

  constructor(ort: OrtLike, session: SessionLike) {
    this.ort = ort;
    this.session = session;
    const size = NEMOTRON.predLayers * NEMOTRON.predHidden;
    this.h = new ort.Tensor('float32', new Float32Array(size), [NEMOTRON.predLayers, 1, NEMOTRON.predHidden]);
    this.c = new ort.Tensor('float32', new Float32Array(size), [NEMOTRON.predLayers, 1, NEMOTRON.predHidden]);
  }

  async output(): Promise<Float32Array> {
    if (!this.pending) {
      const out = await this.session.run({
        targets: new this.ort.Tensor('int64', BigInt64Array.from([BigInt(this.lastToken)]), [1, 1]),
        h_in: this.h,
        c_in: this.c,
      });

      this.pending = { out: out.decoder_output.data as Float32Array, h: out.h_out, c: out.c_out };
    }
    return this.pending.out;
  }

  commit(token: number): void {
    if (!this.pending) throw new Error('commit() without output()');
    this.h.dispose?.();
    this.c.dispose?.();
    this.h = this.pending.h;
    this.c = this.pending.c;
    this.lastToken = token;
    this.pending = null;
  }

  dispose(): void {
    this.h.dispose?.();
    this.c.dispose?.();
    this.pending?.h.dispose?.();
    this.pending?.c.dispose?.();
  }
}

async function greedyDecodeChunk(
  ort: OrtLike,
  joint: SessionLike,
  decoder: PredictionState,
  enc: Float32Array,
  frames: number,
  frameBase: number,
  biaser: ContextBiaser | null = null,
): Promise<NemotronToken[]> {
  const { hidden, predHidden, vocabSize, blankId, maxSymbolsPerStep } = NEMOTRON;
  const emitted: NemotronToken[] = [];
  let t = 0;
  let symbols = 0;
  while (t < frames) {
    const dec = await decoder.output();
    const span = frames - t;
    const out = await joint.run({
      encoder_output: new ort.Tensor('float32', enc.subarray(t * hidden, frames * hidden), [1, span, hidden]),
      decoder_output: new ort.Tensor('float32', dec, [1, 1, predHidden]),
    });
    const logits = out.joint_output.data as Float32Array;

    const bonus = biaser ? biaser.currentBonus() : null;
    let hit = -1;
    let best: number = blankId;
    let bestLp = 0;
    for (let f = 0; f < span; f++) {
      const row = f * vocabSize;
      let arg = 0;
      let max = -Infinity;
      for (let v = 0; v < vocabSize; v++) {
        const x = bonus ? logits[row + v] + bonus[v] : logits[row + v];
        if (x > max) {
          max = x;
          arg = v;
        }
      }
      if (arg !== blankId) {
        hit = f;
        best = arg;
        bestLp = logits[row + arg];
        break;
      }
    }
    out.joint_output.dispose?.();
    if (hit < 0) break;
    if (hit > 0) symbols = 0;
    t += hit;
    emitted.push({ id: best, frame: frameBase + t, logProb: bestLp });
    decoder.commit(best);
    biaser?.advance(best);
    symbols += 1;
    if (symbols >= maxSymbolsPerStep) {
      t += 1;
      symbols = 0;
    }
  }
  return emitted;
}
