import { PreTrainedTokenizer } from '@huggingface/transformers';
import { describe, expect, it, vi } from 'vitest';
import {
  D1_DEFAULT_TEMPERATURES,
  D1_MAX_BATCH_SIZE,
  D1_MAX_TOKENS,
} from './manifest';
import {
  assertD1TokenizerSelfTest,
  bucketSequenceLength,
  collateD1Batch,
  decodeD1Answer,
  encodeD1Prompt,
  escapeD1Text,
  extractD1Temperatures,
  formatD1PromptTemplate,
  getTemperatureKey,
  maskedSoftmax,
  renderD1Options,
  resolveTemperature,
  type D1ConfigLike,
  type D1Question,
  type D1Tokenizer,
} from './prompt';

const SPECIAL_TOKENS: Record<string, number> = {
  '<|pad|>': 0,
  '<|startoftext|>': 1,
  '<|mask|>': 50,
  '<|reserved_7|>': 51,
  '<|reserved_8|>': 52,
  '<|reserved_9|>': 53,
  '<|reserved_10|>': 54,
  '<|reserved_11|>': 55,
};

function createMockTokenizer(overrides: Partial<D1Tokenizer> = {}): {
  tokenizer: D1Tokenizer;
  encodeCalls: Array<{ text: string; add_special_tokens?: boolean }>;
} {
  const encodeCalls: Array<{ text: string; add_special_tokens?: boolean }> = [];
  const tokenizer: D1Tokenizer = {
    bos_token_id: 1,
    pad_token_id: 0,
    convert_tokens_to_ids(token: string) {
      return SPECIAL_TOKENS[token];
    },
    encode(text: string, options?: { add_special_tokens?: boolean }) {
      encodeCalls.push({ text, add_special_tokens: options?.add_special_tokens });
      if (text in SPECIAL_TOKENS) {
        return [SPECIAL_TOKENS[text]];
      }
      // Deterministic per-word/char token IDs >= 100 so they never collide with special tokens.
      const tokens = text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
          let hash = 100;
          for (let i = 0; i < word.length; i++) {
            hash = (hash * 31 + word.charCodeAt(i)) % 60000;
          }
          return hash + 100;
        });
      return tokens;
    },
    ...overrides,
  };
  return { tokenizer, encodeCalls };
}

describe('d1 prompt', () => {
  it('escapes <|name|> tokens in transcript text and speaker labels', () => {
    const raw = '<|reserved_7|>Alice<|mask|>: we should <|reserved_11|> ship <no_token>';
    expect(escapeD1Text(raw)).toBe('<¦reserved_7¦>Alice<¦mask¦>: we should <¦reserved_11¦> ship <no_token>');
  });

  it('formats template with escaped state, question, and options', () => {
    const q: D1Question = {
      type: 'noul',
      instructions: 'Did <|reserved_8|> agree?',
      criteria: { false: 'no', true: 'yes <|mask|>' },
    };
    const rendered = formatD1PromptTemplate('Alice<|mask|>: yes', q);
    expect(rendered).toBe(
      '<bos><|reserved_7|>Alice<¦mask¦>: yes<|reserved_8|>Did <¦reserved_8¦> agree?' +
        '<|reserved_9|><|mask|> false: no<|reserved_10|>' +
        '<|reserved_9|><|mask|> true: yes <¦mask¦><|reserved_10|><|reserved_11|>',
    );
  });

  it('renders choice, score, and noul options in prompt.py order', () => {
    expect(
      renderD1Options({
        type: 'choice',
        instructions: 'pick',
        criteria: { decision: 'agreed', discussion: '' },
      }),
    ).toEqual(['decision: agreed', 'discussion']);

    expect(
      renderD1Options({
        type: 'score',
        instructions: 'rate',
        criteria: ['bad', 'ok', 'good'],
      }),
    ).toEqual(['level 0: bad', 'level 1: ok', 'level 2: good']);

    expect(renderD1Options({ type: 'noul', instructions: 'yes?' })).toEqual([
      'false: no, the statement does not hold',
      'true: yes, the statement holds',
    ]);
  });

  it('passes startup self-test for <|mask|> and <|reserved_7..11|> and rejects broken tokenizers', () => {
    const { tokenizer } = createMockTokenizer();
    const resolved = assertD1TokenizerSelfTest(tokenizer);
    expect(resolved).toEqual({
      bosTokenId: 1,
      padTokenId: 0,
      markerId: 50,
      stateId: 51,
      qId: 52,
      optId: 53,
      optEndId: 54,
      decideId: 55,
    });

    const multiToken = createMockTokenizer({
      encode: (text) => (text === '<|mask|>' ? [50, 51] : [SPECIAL_TOKENS[text] ?? 100]),
    });
    expect(() => assertD1TokenizerSelfTest(multiToken.tokenizer)).toThrow(/instead of 1/);

    const mismatch = createMockTokenizer({
      convert_tokens_to_ids: (tok) => (tok === '<|reserved_9|>' ? 999 : SPECIAL_TOKENS[tok]),
    });
    expect(() => assertD1TokenizerSelfTest(mismatch.tokenizer)).toThrow(/convert_tokens_to_ids/);

    const noBos = createMockTokenizer({ bos_token_id: undefined });
    expect(() => assertD1TokenizerSelfTest(noBos.tokenizer)).toThrow(/bos_token_id/);
  });

  it('validates self-test against a real PreTrainedTokenizer constructed from JSON', () => {
    const addedTokens = [
      { id: 0, content: '<|pad|>', special: true },
      { id: 1, content: '<|startoftext|>', special: true },
      { id: 2, content: '<|im_end|>', special: true },
      { id: 3, content: '<|mask|>', special: true },
      { id: 4, content: '<|reserved_7|>', special: true },
      { id: 5, content: '<|reserved_8|>', special: true },
      { id: 6, content: '<|reserved_9|>', special: true },
      { id: 7, content: '<|reserved_10|>', special: true },
      { id: 8, content: '<|reserved_11|>', special: true },
    ];
    const vocab: Record<string, number> = {
      hello: 9,
      world: 10,
      '<|pad|>': 0,
      '<|startoftext|>': 1,
      '<|im_end|>': 2,
      '<|mask|>': 3,
      '<|reserved_7|>': 4,
      '<|reserved_8|>': 5,
      '<|reserved_9|>': 6,
      '<|reserved_10|>': 7,
      '<|reserved_11|>': 8,
    };
    const tokenizerJson = {
      version: '1.0',
      truncation: null,
      padding: null,
      added_tokens: addedTokens,
      normalizer: null,
      pre_tokenizer: { type: 'Whitespace' },
      post_processor: null,
      decoder: null,
      model: { type: 'WordLevel', vocab, unk_token: '<|pad|>' },
    };
    const tokenizerConfig = {
      bos_token: '<|startoftext|>',
      eos_token: '<|im_end|>',
      pad_token: '<|pad|>',
      mask_token: '<|mask|>',
    };

    const realTok = new PreTrainedTokenizer(tokenizerJson, tokenizerConfig) as unknown as D1Tokenizer;
    const resolved = assertD1TokenizerSelfTest(realTok);
    expect(resolved.bosTokenId).toBe(1);
    expect(resolved.markerId).toBe(3);

    const encoded = encodeD1Prompt(realTok, 'hello <|mask|> world', {
      type: 'noul',
      instructions: 'hello world',
    });
    expect(encoded.inputIds[0]).toBe(1);
    expect(encoded.markerPos).toHaveLength(2);
    expect(encoded.inputIds[encoded.markerPos[0]]).toBe(3);
    expect(encoded.inputIds[encoded.markerPos[1]]).toBe(3);
  });

  it('encodes with add_special_tokens: false, finds marker_pos in token IDs, and caps maxTokens <= 1024', () => {
    const { tokenizer, encodeCalls } = createMockTokenizer();
    const hugeState = Array.from({ length: 1500 }, (_, i) => `word${i}`).join(' ');
    const encoded = encodeD1Prompt(
      tokenizer,
      hugeState,
      {
        type: 'choice',
        instructions: 'classify excerpt',
        criteria: {
          decision: 'agreed on plan',
          action_item: 'assigned task',
          discussion: 'general talk',
        },
      },
      { maxTokens: 4096 },
    );

    expect(encodeCalls.every((c) => c.add_special_tokens === false)).toBe(true);
    expect(encoded.inputIds[0]).toBe(1);
    expect(encoded.inputIds.length).toBeLessThanOrEqual(D1_MAX_TOKENS);
    expect(encoded.markerPos).toHaveLength(3);
    for (const pos of encoded.markerPos) {
      expect(encoded.inputIds[pos]).toBe(SPECIAL_TOKENS['<|mask|>']);
    }
  });

  it('buckets sequence length to multiples of 64/128 and collates BigInt64Array batch <= 4', () => {
    expect(bucketSequenceLength(1)).toBe(64);
    expect(bucketSequenceLength(64)).toBe(64);
    expect(bucketSequenceLength(65)).toBe(128);
    expect(bucketSequenceLength(256)).toBe(256);
    expect(bucketSequenceLength(257)).toBe(384);
    expect(bucketSequenceLength(900)).toBe(1024);
    expect(bucketSequenceLength(2000)).toBe(1024);

    const { tokenizer } = createMockTokenizer();
    const p1 = encodeD1Prompt(tokenizer, 'short state', {
      type: 'noul',
      instructions: 'yes or no',
    });
    const p2 = encodeD1Prompt(tokenizer, 'another state here', {
      type: 'choice',
      instructions: 'pick one',
      criteria: { a: 'one', b: 'two', c: 'three', d: 'four' },
    });

    const batch = collateD1Batch([p1, p2]);
    expect(batch.batchSize).toBe(2);
    expect(batch.seqLen).toBe(64);
    expect(batch.maxMarkers).toBe(4);
    expect(batch.inputIds).toBeInstanceOf(BigInt64Array);
    expect(batch.attentionMask).toBeInstanceOf(BigInt64Array);
    expect(batch.prefixLen).toEqual(new BigInt64Array([BigInt(0), BigInt(0)]));
    expect(batch.qtype).toEqual(new BigInt64Array([BigInt(2), BigInt(0)]));

    // Item 0 has 2 options and 2 padded marker slots.
    expect(batch.markerMask.slice(0, 4)).toEqual(
      new BigInt64Array([BigInt(1), BigInt(1), BigInt(0), BigInt(0)]),
    );
    expect(batch.markerMask.slice(4, 8)).toEqual(
      new BigInt64Array([BigInt(1), BigInt(1), BigInt(1), BigInt(1)]),
    );
    expect(batch.attentionMask[p1.inputIds.length - 1]).toBe(BigInt(1));
    expect(batch.attentionMask[p1.inputIds.length]).toBe(BigInt(0));

    expect(() => collateD1Batch([p1, p1, p1, p1, p1])).toThrow(
      new RegExp(`exceeds cap ${D1_MAX_BATCH_SIZE}`),
    );
  });

  it('masks padded logits to -Infinity before softmax(logits / T) and reads config temperatures', () => {
    const config: D1ConfigLike = {
      temperatures: {
        'noul:2': 2.0,
        'choice:3-5': 1.5,
      },
    };
    const temps = extractD1Temperatures(config);
    expect(temps['noul:2']).toBe(2.0);
    expect(temps['choice:2']).toBe(D1_DEFAULT_TEMPERATURES['choice:2']);
    expect(getTemperatureKey({ type: 'score', instructions: 's', criteria: ['0', '1', '2', '3'] })).toBe(
      'score:3-5',
    );
    expect(resolveTemperature({ type: 'noul', instructions: 'n' }, temps)).toBe(2.0);

    // Even a giant logit (1000) in padded index 2 must get 0 mass.
    const probs = maskedSoftmax([1.0, 3.0, 1000.0, 1000.0], 2, 2.0);
    expect(probs).toHaveLength(2);
    expect(probs[0] + probs[1]).toBeCloseTo(1, 6);
    expect(probs[1]).toBeCloseTo(Math.exp(1.5) / (Math.exp(0.5) + Math.exp(1.5)), 6);

    // noul reverses [false, true] -> [P(yes), P(no)]
    const noulAns = decodeD1Answer(
      { type: 'noul', instructions: 'agreed?' },
      [0.0, 2.0, 999.0],
      temps,
    );
    expect(noulAns.type).toBe('noul');
    if (noulAns.type === 'noul') {
      expect(noulAns.noul).toBeGreaterThan(0.7);
      expect(noulAns.probabilities[0]).toBeCloseTo(noulAns.noul, 6);
      expect(noulAns.probabilities[0] + noulAns.probabilities[1]).toBeCloseTo(1, 6);
    }

    // score computes expected value sum(i * p_i)
    const scoreAns = decodeD1Answer(
      { type: 'score', instructions: 'quality', criteria: ['0', '1', '2', '3'] },
      [-10, -10, -10, 10],
      temps,
    );
    expect(scoreAns.type).toBe('score');
    if (scoreAns.type === 'score') {
      expect(scoreAns.score).toBeCloseTo(3, 3);
    }
  });

  it('calls encode with add_special_tokens: false when checking spy', () => {
    const spy = vi.fn<(opts?: { add_special_tokens?: boolean }) => void>();
    const tok: D1Tokenizer = {
      bos_token_id: 1,
      pad_token_id: 0,
      convert_tokens_to_ids: (t) => SPECIAL_TOKENS[t],
      encode: (text, opts) => {
        spy(opts);
        return text in SPECIAL_TOKENS ? [SPECIAL_TOKENS[text]] : [101];
      },
    };
    encodeD1Prompt(tok, 'hello', { type: 'noul', instructions: 'ok?' });
    expect(spy).toHaveBeenCalledWith({ add_special_tokens: false });
  });
});
