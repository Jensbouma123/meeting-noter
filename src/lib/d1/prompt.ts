/**
 * Pure TypeScript prompt builder, batch collator, and calibrated post-processor
 * for LiquidAI `d1-omni-600M-ONNX` zero-token inference.
 */

import {
  D1_DEFAULT_TEMPERATURES,
  D1_DELIMITERS,
  D1_MARKER_TOKEN,
  D1_MAX_BATCH_SIZE,
  D1_MAX_TOKENS,
  D1_QTYPES,
} from './manifest';

export type D1QuestionType = 'choice' | 'score' | 'noul';

export interface D1ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string | null | undefined>;
}

export interface D1ScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: readonly string[];
}

export interface D1NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: {
    true?: string;
    false?: string;
    yes?: string;
    no?: string;
  };
}

export type D1Question = D1ChoiceQuestion | D1ScoreQuestion | D1NoulQuestion;

export interface D1Tokenizer {
  encode(text: string, options?: { add_special_tokens?: boolean }): number[];
  convert_tokens_to_ids(token: string): number | null | undefined;
  bos_token_id?: number | null;
  pad_token_id?: number | null;
}

export interface D1ConfigLike {
  bos_token_id?: number;
  pad_token_id?: number;
  max_length?: number;
  temperatures?: Record<string, number>;
  d1_omni?: {
    temperatures?: Record<string, number>;
  };
}

export interface D1ResolvedTokens {
  bosTokenId: number;
  padTokenId: number;
  markerId: number;
  stateId: number;
  qId: number;
  optId: number;
  optEndId: number;
  decideId: number;
}

export interface D1EncodedPrompt {
  inputIds: number[];
  markerPos: number[];
  qtype: 0 | 1 | 2;
  numOptions: number;
  temperatureKey: string;
}

export interface D1EncodedBatch {
  batchSize: number;
  seqLen: number;
  maxMarkers: number;
  inputIds: BigInt64Array;
  attentionMask: BigInt64Array;
  prefixLen: BigInt64Array;
  markerPos: BigInt64Array;
  markerMask: BigInt64Array;
  qtype: BigInt64Array;
}

export type D1Answer =
  | { type: 'noul'; noul: number; probabilities: [yes: number, no: number] }
  | { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: 'score'; score: number; confidence: number; probabilities: Record<string, number> };

const SPECIAL_TOKEN_RE = /<\|([A-Za-z0-9_]+)\|>/g;

/**
 * Rewrite `<|name|>` -> `<¦name¦>` in caller text and speaker labels so
 * untrusted text can never forge delimiter or `<|mask|>` tokens.
 */
export function escapeD1Text(text: string): string {
  return text.replace(SPECIAL_TOKEN_RE, '<¦$1¦>');
}

function serializeState(state: unknown): string {
  return typeof state === 'string' ? state : JSON.stringify(state);
}

export function getQuestionOptionCount(q: D1Question): number {
  if (q.type === 'noul') return 2;
  if (q.type === 'score') return q.criteria.length;
  return Object.keys(q.criteria).length;
}

export function validateD1Question(q: D1Question): void {
  if (q.type === 'choice') {
    if (!q.criteria || typeof q.criteria !== 'object' || Object.keys(q.criteria).length < 2) {
      throw new Error('D1 choice question requires at least 2 criteria entries');
    }
    return;
  }
  if (q.type === 'score') {
    if (!Array.isArray(q.criteria) || q.criteria.length < 2 || q.criteria.length > 10) {
      throw new Error('D1 score question requires 2 to 10 criteria levels');
    }
    return;
  }
  if (q.type !== 'noul') {
    throw new Error(`Unsupported D1 question type: ${(q as { type: string }).type}`);
  }
}

/** Render option descriptions in the exact order expected by `d1-omni-600M`. */
export function renderD1Options(q: D1Question): string[] {
  validateD1Question(q);
  if (q.type === 'choice') {
    return Object.entries(q.criteria).map(([key, value]) =>
      value === null || value === undefined || value === '' ? key : `${key}: ${value}`,
    );
  }
  if (q.type === 'score') {
    return q.criteria.map((desc, idx) => `level ${idx}: ${desc}`);
  }
  const crit = q.criteria ?? {};
  const falseText = crit.false ?? crit.no;
  const trueText = crit.true ?? crit.yes;
  return [
    `false: ${falseText && falseText.length > 0 ? falseText : 'no, the statement does not hold'}`,
    `true: ${trueText && trueText.length > 0 ? trueText : 'yes, the statement holds'}`,
  ];
}

/**
 * Render the escaped prompt template string:
 * `<bos><|reserved_7|>{state}<|reserved_8|>{q}<|reserved_9|><|mask|>{opt_0}<|reserved_10|>...<|reserved_11|>`
 */
export function formatD1PromptTemplate(
  state: string | Record<string, unknown>,
  q: D1Question,
  bosToken = '<bos>',
): string {
  const options = renderD1Options(q);
  const optionBlocks = options
    .map(
      (opt) =>
        `${D1_DELIMITERS.opt}${D1_MARKER_TOKEN} ${escapeD1Text(opt)}${D1_DELIMITERS.opt_end}`,
    )
    .join('');
  return (
    `${bosToken}` +
    `${D1_DELIMITERS.state}${escapeD1Text(serializeState(state))}` +
    `${D1_DELIMITERS.q}${escapeD1Text(q.instructions)}` +
    `${optionBlocks}` +
    `${D1_DELIMITERS.decide}`
  );
}

function assertSingleTokenId(tokenizer: D1Tokenizer, token: string): number {
  const mappedId = tokenizer.convert_tokens_to_ids(token);
  const encoded = tokenizer.encode(token, { add_special_tokens: false });
  if (encoded.length !== 1) {
    throw new Error(
      `D1 tokenizer self-test failed: ${token} encoded to ${encoded.length} tokens instead of 1`,
    );
  }
  const tokenId = encoded[0];
  if (!Number.isInteger(tokenId) || tokenId < 0) {
    throw new Error(`D1 tokenizer self-test failed: ${token} produced invalid token id ${tokenId}`);
  }
  if (mappedId !== undefined && mappedId !== null && mappedId !== tokenId) {
    throw new Error(
      `D1 tokenizer self-test failed: ${token} convert_tokens_to_ids (${mappedId}) !== encode (${tokenId})`,
    );
  }
  return tokenId;
}

/**
 * Startup self-test verifying `<|mask|>` and `<|reserved_7..11|>` each map to
 * exactly one distinct token ID, and resolving `bos_token_id` / `pad_token_id`.
 */
export function assertD1TokenizerSelfTest(
  tokenizer: D1Tokenizer,
  config?: D1ConfigLike,
): D1ResolvedTokens {
  const bosTokenId = tokenizer.bos_token_id ?? config?.bos_token_id;
  if (bosTokenId === null || bosTokenId === undefined || !Number.isInteger(bosTokenId) || bosTokenId < 0) {
    throw new Error(`D1 tokenizer self-test failed: invalid bos_token_id (${String(bosTokenId)})`);
  }
  const padTokenId = tokenizer.pad_token_id ?? config?.pad_token_id ?? 0;
  if (!Number.isInteger(padTokenId) || padTokenId < 0) {
    throw new Error(`D1 tokenizer self-test failed: invalid pad_token_id (${String(padTokenId)})`);
  }

  const markerId = assertSingleTokenId(tokenizer, D1_MARKER_TOKEN);
  const stateId = assertSingleTokenId(tokenizer, D1_DELIMITERS.state);
  const qId = assertSingleTokenId(tokenizer, D1_DELIMITERS.q);
  const optId = assertSingleTokenId(tokenizer, D1_DELIMITERS.opt);
  const optEndId = assertSingleTokenId(tokenizer, D1_DELIMITERS.opt_end);
  const decideId = assertSingleTokenId(tokenizer, D1_DELIMITERS.decide);

  const unique = new Set([markerId, stateId, qId, optId, optEndId, decideId]);
  if (unique.size !== 6) {
    throw new Error('D1 tokenizer self-test failed: delimiter and marker tokens must have distinct IDs');
  }

  return {
    bosTokenId,
    padTokenId,
    markerId,
    stateId,
    qId,
    optId,
    optEndId,
    decideId,
  };
}

/** Extract temperature map from `config.json`, falling back to `D1_DEFAULT_TEMPERATURES`. */
export function extractD1Temperatures(config?: D1ConfigLike): Record<string, number> {
  const merged: Record<string, number> = { ...D1_DEFAULT_TEMPERATURES };
  const sources = [config?.d1_omni?.temperatures, config?.temperatures];
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const [key, value] of Object.entries(src)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function getTemperatureKey(q: D1Question): string {
  const k = getQuestionOptionCount(q);
  const bucket = k <= 2 ? '2' : k <= 5 ? '3-5' : k <= 10 ? '6-10' : '11+';
  return `${q.type}:${bucket}`;
}

export function resolveTemperature(
  q: D1Question,
  temperatures: Record<string, number> = D1_DEFAULT_TEMPERATURES,
): number {
  const key = getTemperatureKey(q);
  const value =
    temperatures[key] ??
    temperatures[q.type] ??
    D1_DEFAULT_TEMPERATURES[key] ??
    D1_DEFAULT_TEMPERATURES[q.type] ??
    1.0;
  return Number.isFinite(value) && value > 0 ? value : 1.0;
}

/**
 * Encode one D1 question over a transcript state with `{ add_special_tokens: false }`,
 * capping total sequence length to `maxTokens <= 1024` and locating `marker_pos`
 * directly in the resulting token ID array.
 */
export function encodeD1Prompt(
  tokenizer: D1Tokenizer,
  state: string | Record<string, unknown>,
  q: D1Question,
  options: {
    maxTokens?: number;
    perOption?: number;
    tokens?: D1ResolvedTokens;
    config?: D1ConfigLike;
  } = {},
): D1EncodedPrompt {
  validateD1Question(q);
  const maxTokens = Math.max(16, Math.min(options.maxTokens ?? D1_MAX_TOKENS, D1_MAX_TOKENS));
  const perOption = options.perOption ?? 24;
  const tokens = options.tokens ?? assertD1TokenizerSelfTest(tokenizer, options.config);

  const enc = (text: string): number[] =>
    tokenizer.encode(escapeD1Text(text), { add_special_tokens: false });

  const opts = renderD1Options(q);
  const budget = Math.max(96, Math.min(opts.length * perOption + 32, Math.floor(maxTokens / 2)));
  const per = Math.max(2, Math.floor((budget - 3 * opts.length) / opts.length));

  const qHeader = [tokens.qId, ...enc(q.instructions)].slice(0, Math.max(16, budget));
  const questionIds: number[] = [...qHeader];
  for (const optText of opts) {
    questionIds.push(
      tokens.optId,
      tokens.markerId,
      ...enc(` ${optText}`).slice(0, per),
      tokens.optEndId,
    );
  }
  questionIds.push(tokens.decideId);

  const room = Math.max(0, maxTokens - questionIds.length - 2);
  const stateIds = [tokens.stateId, ...enc(serializeState(state)).slice(0, room)];
  const inputIds = [tokens.bosTokenId, ...stateIds, ...questionIds].slice(0, maxTokens);

  // Locate `<|mask|>` marker indices directly in the encoded token IDs.
  const markerPos: number[] = [];
  for (let i = 0; i < inputIds.length; i++) {
    if (inputIds[i] === tokens.markerId) {
      markerPos.push(i);
    }
  }
  if (markerPos.length !== opts.length) {
    throw new Error(
      `D1 prompt options exceeded maxTokens (${maxTokens}): expected ${opts.length} markers, found ${markerPos.length}`,
    );
  }

  return {
    inputIds,
    markerPos,
    qtype: D1_QTYPES[q.type],
    numOptions: opts.length,
    temperatureKey: getTemperatureKey(q),
  };
}

/** Round `length` up to a 64-token (<= 256) or 128-token (> 256) bucket, capped at `maxTokens <= 1024`. */
export function bucketSequenceLength(length: number, maxTokens: number = D1_MAX_TOKENS): number {
  const cap = Math.max(1, Math.min(maxTokens, D1_MAX_TOKENS));
  const clamped = Math.max(1, Math.min(length, cap));
  const step = clamped <= 256 ? 64 : 128;
  const bucket = Math.ceil(clamped / step) * step;
  return Math.min(bucket, cap);
}

/**
 * Pad and collate up to `D1_MAX_BATCH_SIZE` (4) encoded prompts into `int64`
 * (`BigInt64Array`) tensor buffers ready for `onnxruntime-web`.
 */
export function collateD1Batch(
  prompts: readonly D1EncodedPrompt[],
  options: { padTokenId?: number; maxTokens?: number } = {},
): D1EncodedBatch {
  if (prompts.length === 0) {
    throw new Error('collateD1Batch requires at least 1 prompt');
  }
  if (prompts.length > D1_MAX_BATCH_SIZE) {
    throw new RangeError(
      `D1 batch size ${prompts.length} exceeds cap ${D1_MAX_BATCH_SIZE}`,
    );
  }

  const maxTokens = Math.min(options.maxTokens ?? D1_MAX_TOKENS, D1_MAX_TOKENS);
  const padTokenId = BigInt(options.padTokenId ?? 0);
  const batchSize = prompts.length;
  const maxPromptLen = Math.max(...prompts.map((p) => p.inputIds.length));
  if (maxPromptLen > maxTokens) {
    throw new RangeError(
      `D1 prompt length ${maxPromptLen} exceeds maxTokens cap ${maxTokens}`,
    );
  }
  const seqLen = bucketSequenceLength(maxPromptLen, maxTokens);
  const maxMarkers = Math.max(...prompts.map((p) => p.markerPos.length));

  const inputIds = new BigInt64Array(batchSize * seqLen).fill(padTokenId);
  const attentionMask = new BigInt64Array(batchSize * seqLen);
  const prefixLen = new BigInt64Array(batchSize);
  const markerPos = new BigInt64Array(batchSize * maxMarkers);
  const markerMask = new BigInt64Array(batchSize * maxMarkers);
  const qtype = new BigInt64Array(batchSize);

  for (let b = 0; b < batchSize; b++) {
    const prompt = prompts[b];
    const seqOffset = b * seqLen;
    for (let i = 0; i < prompt.inputIds.length; i++) {
      inputIds[seqOffset + i] = BigInt(prompt.inputIds[i]);
      attentionMask[seqOffset + i] = BigInt(1);
    }

    const markerOffset = b * maxMarkers;
    for (let k = 0; k < prompt.markerPos.length; k++) {
      markerPos[markerOffset + k] = BigInt(prompt.markerPos[k]);
      markerMask[markerOffset + k] = BigInt(1);
    }

    qtype[b] = BigInt(prompt.qtype);
  }

  return {
    batchSize,
    seqLen,
    maxMarkers,
    inputIds,
    attentionMask,
    prefixLen,
    markerPos,
    markerMask,
    qtype,
  };
}

/**
 * Mask padded logits (`>= validCount`) to `-Infinity` and compute numerically
 * stable `softmax(logits / T)`.
 */
export function maskedSoftmax(
  logits: ArrayLike<number>,
  validCount: number,
  temperature: number,
): number[] {
  if (validCount <= 0 || validCount > logits.length) {
    throw new RangeError(`Invalid validCount ${validCount} for logits length ${logits.length}`);
  }
  const invTemp = 1 / (Number.isFinite(temperature) && temperature > 0 ? temperature : 1.0);
  const scaled = new Array<number>(logits.length);
  let maxLogit = -Infinity;

  for (let i = 0; i < logits.length; i++) {
    if (i >= validCount || !Number.isFinite(logits[i])) {
      scaled[i] = -Infinity;
    } else {
      const value = logits[i] * invTemp;
      scaled[i] = value;
      if (value > maxLogit) maxLogit = value;
    }
  }

  if (!Number.isFinite(maxLogit)) {
    const uniform = 1 / validCount;
    return Array.from({ length: validCount }, () => uniform);
  }

  const exps = new Array<number>(validCount);
  let sumExp = 0;
  for (let i = 0; i < validCount; i++) {
    const val = scaled[i] === -Infinity ? 0 : Math.exp(scaled[i] - maxLogit);
    exps[i] = val;
    sumExp += val;
  }

  if (sumExp <= 0 || !Number.isFinite(sumExp)) {
    const uniform = 1 / validCount;
    return Array.from({ length: validCount }, () => uniform);
  }

  return exps.map((e) => e / sumExp);
}

/**
 * Apply calibrated temperature scaling, masked softmax, and `noul` polarity
 * reversal (`[false, true]` -> `[P(yes), P(no)]`) to raw logits for one item.
 */
export function decodeD1Answer(
  q: D1Question,
  rawLogits: ArrayLike<number>,
  temperatures: Record<string, number> = D1_DEFAULT_TEMPERATURES,
): D1Answer {
  validateD1Question(q);
  const numOptions = getQuestionOptionCount(q);
  const temperature = resolveTemperature(q, temperatures);
  const probs = maskedSoftmax(rawLogits, numOptions, temperature);

  if (q.type === 'noul') {
    // Prompt renders [false, true], so index 1 is P(yes) and index 0 is P(no).
    const pYes = probs[1];
    const pNo = probs[0];
    return {
      type: 'noul',
      noul: pYes,
      probabilities: [pYes, pNo],
    };
  }

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  if (q.type === 'choice') {
    const names = Object.keys(q.criteria);
    const probabilities: Record<string, number> = {};
    for (let i = 0; i < names.length; i++) {
      probabilities[names[i]] = probs[i];
    }
    return {
      type: 'choice',
      choice: names[bestIdx],
      confidence: probs[bestIdx],
      probabilities,
    };
  }

  let expectedScore = 0;
  const probabilities: Record<string, number> = {};
  for (let i = 0; i < probs.length; i++) {
    expectedScore += i * probs[i];
    probabilities[String(i)] = probs[i];
  }
  return {
    type: 'score',
    score: expectedScore,
    confidence: probs[bestIdx],
    probabilities,
  };
}
