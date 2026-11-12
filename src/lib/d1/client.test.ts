import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createD1Client, D1_BOOT_ERROR, D1_BOOT_TIMEOUT_MS, D1_DECIDE_TIMEOUT_MS, type WorkerLike } from './client';
import { getD1StageSnapshot } from './stage';
import {
  D1_CONFIG_FILE,
  D1_GRAPH_FILE,
  D1_MAX_BATCH_SIZE,
  D1_TOKENIZER_CONFIG_FILE,
  D1_TOKENIZER_FILE,
  D1_WEIGHTS_FILE,
} from './manifest';
import type { D1Answer, D1Tokenizer } from './prompt';
import type {
  D1DecisionRequest,
  D1SegmentInput,
  D1WorkerInMessage,
  D1WorkerOutMessage,
} from './protocol';
import { createD1WorkerHandler } from './worker';

class FakeWorker implements WorkerLike {
  readonly posted: D1WorkerInMessage[] = [];
  terminated = false;
  private messageListeners = new Set<(ev: MessageEvent<D1WorkerOutMessage>) => void>();
  private errorListeners = new Set<(ev: Event) => void>();

  constructor(private readonly onPost?: (msg: D1WorkerInMessage, worker: FakeWorker) => void) {}

  postMessage(message: D1WorkerInMessage): void {
    this.posted.push(message);
    this.onPost?.(message, this);
  }

  terminate(): void {
    this.terminated = true;
  }

  onmessageerror: ((ev: MessageEvent) => void) | null = null;

  emitError(event: Partial<ErrorEvent>): void {
    for (const listener of this.errorListeners) listener(event as Event);
  }

  emitMessage(msg: D1WorkerOutMessage): void {
    const ev = { data: msg } as MessageEvent<D1WorkerOutMessage>;
    for (const listener of this.messageListeners) {
      listener(ev);
    }
  }

  addEventListener(
    type: 'message' | 'error',
    listener: ((ev: MessageEvent<D1WorkerOutMessage>) => void) | ((ev: Event) => void),
  ): void {
    if (type === 'message') {
      this.messageListeners.add(listener as (ev: MessageEvent<D1WorkerOutMessage>) => void);
    } else {
      this.errorListeners.add(listener as (ev: Event) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((ev: MessageEvent<D1WorkerOutMessage>) => void) | ((ev: Event) => void),
  ): void {
    if (type === 'message') {
      this.messageListeners.delete(listener as (ev: MessageEvent<D1WorkerOutMessage>) => void);
    } else {
      this.errorListeners.delete(listener as (ev: Event) => void);
    }
  }
}

const SPECIAL: Record<string, number> = {
  '<|pad|>': 0,
  '<|startoftext|>': 1,
  '<|mask|>': 50,
  '<|reserved_7|>': 51,
  '<|reserved_8|>': 52,
  '<|reserved_9|>': 53,
  '<|reserved_10|>': 54,
  '<|reserved_11|>': 55,
};

function makeFakeTokenizer(): D1Tokenizer {
  return {
    bos_token_id: 1,
    pad_token_id: 0,
    convert_tokens_to_ids: (tok) => SPECIAL[tok],
    encode: (text) => (text in SPECIAL ? [SPECIAL[text]] : [120, 121]),
  };
}

describe('d1 worker handler', () => {
  it('reports not-cached error when D1 model files are missing', async () => {
    const out: D1WorkerOutMessage[] = [];
    const handle = createD1WorkerHandler((m) => out.push(m), {
      assertCached: async () => {
        throw new Error('LiquidAI D1 model is not downloaded');
      },
    });

    await handle({ type: 'init', id: 'init-1' });
    expect(out.filter((m) => m.type !== 'stage')).toEqual([
      {
        type: 'error',
        id: 'init-1',
        message: 'LiquidAI D1 model is not downloaded',
        code: 'not-cached',
      },
    ]);
  });

  it('revokes blob URLs in finally {} even when session creation fails', async () => {
    const out: D1WorkerOutMessage[] = [];
    const revoked: Array<Record<string, string | undefined>> = [];
    const urls = {
      [D1_CONFIG_FILE.filename]: 'blob:cfg',
      [D1_TOKENIZER_FILE.filename]: 'blob:tok',
      [D1_TOKENIZER_CONFIG_FILE.filename]: 'blob:tokcfg',
      [D1_GRAPH_FILE.filename]: 'blob:graph',
      [D1_WEIGHTS_FILE.filename]: 'blob:weights',
    };

    const handle = createD1WorkerHandler((m) => out.push(m), {
      assertCached: async () => {},
      downloadModels: async () => urls,
      readJson: async <T>() => ({ bos_token_id: 1, pad_token_id: 0 } as T),
      getModelSource: () => new Uint8Array([1, 2, 3]),
      revokeUrls: (u) => revoked.push(u),
      createTokenizer: () => makeFakeTokenizer(),
      createOrtSession: async () => {
        throw new Error('WebGPU + WASM failed');
      },
    });

    await handle({ type: 'init', id: 'init-fail' });
    expect(revoked).toEqual([urls]);
    expect(out.filter((m) => m.type !== 'stage')[0]).toMatchObject({
      type: 'error',
      id: 'init-fail',
      code: 'failed',
    });
  });

  it('serializes session.run via Mutex, caps batches <= 4, disposes all tensors, and releases on dispose', async () => {
    const out: D1WorkerOutMessage[] = [];
    const disposedTensors: string[] = [];
    let inFlightRuns = 0;
    let maxConcurrentRuns = 0;
    const batchSizes: number[] = [];
    let sessionReleased = false;

    const fakeSession = {
      inputNames: ['input_ids', 'attention_mask', 'prefix_len', 'marker_pos', 'marker_mask', 'qtype'],
      outputNames: ['logits'],
      async run(feeds: Record<string, { dims: readonly number[] }>) {
        inFlightRuns += 1;
        maxConcurrentRuns = Math.max(maxConcurrentRuns, inFlightRuns);
        const batchSize = feeds.input_ids.dims[0];
        const maxMarkers = feeds.marker_pos.dims[1];
        batchSizes.push(batchSize);
        await new Promise((r) => setTimeout(r, 5));
        inFlightRuns -= 1;

        const logits = new Float32Array(batchSize * maxMarkers);
        for (let b = 0; b < batchSize; b++) {
          logits[b * maxMarkers + 1] = 3.0; // favour index 1 (true for noul)
        }
        return {
          logits: {
            data: logits,
            dims: [batchSize, maxMarkers],
            dispose: () => disposedTensors.push('output:logits'),
          },
        };
      },
      async release() {
        sessionReleased = true;
      },
    };

    const handle = createD1WorkerHandler((m) => out.push(m), {
      assertCached: async () => {},
      downloadModels: async () => ({
        [D1_CONFIG_FILE.filename]: 'blob:cfg',
        [D1_TOKENIZER_FILE.filename]: 'blob:tok',
        [D1_TOKENIZER_CONFIG_FILE.filename]: 'blob:tokcfg',
        [D1_GRAPH_FILE.filename]: 'blob:graph',
        [D1_WEIGHTS_FILE.filename]: 'blob:weights',
      }),
      readJson: async <T>() => ({ bos_token_id: 1, pad_token_id: 0 } as T),
      getModelSource: () => new Uint8Array(),
      revokeUrls: () => {},
      createTokenizer: () => makeFakeTokenizer(),
      createOrtSession: async () => ({ session: fakeSession as never, backend: 'wasm' }),
      createTensor: (type, data, dims) => {
        expect(type).toBe('int64');
        expect(data).toBeInstanceOf(BigInt64Array);
        return {
          type,
          data,
          dims,
          dispose: () => disposedTensors.push(`input:${dims.join('x')}`),
        } as never;
      },
    });

    const reqs = Array.from({ length: 6 }, (_, i) => ({
      state: `Segment ${i}`,
      question: { type: 'noul' as const, instructions: 'Is this clear?' },
    }));

    // Dispatch two concurrent decide messages to verify Mutex serialization.
    await Promise.all([
      handle({ type: 'decide', id: 'req-1', requests: reqs }),
      handle({ type: 'decide', id: 'req-2', requests: reqs.slice(0, 2) }),
    ]);

    expect(maxConcurrentRuns).toBe(1);
    expect(batchSizes).toEqual([D1_MAX_BATCH_SIZE, 2, 2]);
    // 3 batches * (6 input tensors + 1 output tensor) = 21 disposals.
    expect(disposedTensors).toHaveLength(21);

    const res1 = out.find((m) => m.type === 'result' && m.id === 'req-1');
    expect(res1 && res1.type === 'result' ? res1.answers : []).toHaveLength(6);

    expect(out.filter((m) => m.type === 'stage' && m.id === 'req-1')).toEqual([
      { type: 'stage', id: 'req-1', stage: { kind: 'loading' } },
      { type: 'stage', id: 'req-1', stage: { kind: 'session' } },
      { type: 'stage', id: 'req-1', stage: { kind: 'sending', batch: 1 } },
      { type: 'stage', id: 'req-1', stage: { kind: 'waiting' } },
      { type: 'stage', id: 'req-1', stage: { kind: 'sending', batch: 2 } },
      { type: 'stage', id: 'req-1', stage: { kind: 'waiting' } },
    ]);

    await handle({ type: 'dispose', id: 'disp-1' });
    expect(sessionReleased).toBe(true);
    expect(out).toContainEqual({ type: 'disposed', id: 'disp-1' });
  });
});

describe('d1 client', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lazily creates worker and resolves dispose without spawning when unused', async () => {
    const createWorker = vi.fn(() => new FakeWorker());
    const client = createD1Client({ createWorker });

    await client.dispose();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('triages only lowConfSpans by default, detects decisions/actions, and verifies speaker turns without mutating segments', async () => {
    let workerInstance: FakeWorker | null = null;
    const client = createD1Client({
      createWorker: () => {
        workerInstance = new FakeWorker((msg, w) => {
          if (msg.type === 'decide') {
            expect(msg.requests.length).toBeLessThanOrEqual(D1_MAX_BATCH_SIZE);
            const answers: D1Answer[] = msg.requests.map((req): D1Answer => {
              if (req.question.type === 'score') {
                return {
                  type: 'score',
                  score: 1.0,
                  confidence: 0.7,
                  probabilities: { '0': 0.2, '1': 0.6, '2': 0.2, '3': 0 },
                };
              }
              if (req.question.type === 'choice') {
                const stateStr = String(req.state);
                const pick = stateStr.includes('Friday') ? 'action_item' : 'decision';
                return {
                  type: 'choice',
                  choice: pick,
                  confidence: 0.82,
                  probabilities: {
                    decision: pick === 'decision' ? 0.82 : 0.08,
                    action_item: pick === 'action_item' ? 0.82 : 0.08,
                    question: 0.04,
                    blocker: 0.03,
                    discussion: 0.03,
                  },
                };
              }
              const stateStr = String(req.state);
              const instr = req.question.instructions;
              let pYes = 0.2;
              if (instr.includes('Segment B')) {
                pYes = stateStr.includes('continuation') ? 0.85 : 0.2;
              } else if (instr.includes('Flagged span')) {
                pYes = stateStr.includes('blorp') ? 0.85 : 0.2;
              } else {
                pYes = stateStr.includes('agree') || stateStr.includes('Friday') ? 0.85 : 0.2;
              }
              return { type: 'noul', noul: pYes, probabilities: [pYes, 1 - pYes] };
            });
            queueMicrotask(() => {
              w.emitMessage({ type: 'result', id: msg.id, answers, backend: 'webgpu' });
            });
          } else if (msg.type === 'dispose') {
            queueMicrotask(() => {
              w.emitMessage({ type: 'disposed', id: msg.id });
            });
          }
        });
        return workerInstance;
      },
    });

    const segments: D1SegmentInput[] = [
      {
        id: 's1',
        speaker: 'Alice',
        text: 'We agree to ship v2 next week.',
        start: 0,
        end: 3,
      },
      {
        id: 's2',
        speaker: 'Bob',
        text: 'Sounds good, blorp will deploy on Friday.',
        start: 3,
        end: 6,
        lowConfSpans: [[13, 18, 0.32]],
      },
      {
        id: 's3',
        speaker: 'Alice',
        text: 'continuation of previous sentence.',
        start: 6,
        end: 8,
      },
    ];
    const snapshotBefore = JSON.stringify(segments);

    const triage = await client.triageLowConfidence(segments);
    expect(triage).toHaveLength(1);
    expect(triage[0].segmentId).toBe('s2');
    expect(triage[0].flagged).toBe(true);
    expect(triage[0].coherenceScore).toBeCloseTo(1 / 3, 5);
    expect(triage[0].reviewedSpans[0]).toMatchObject({
      startChar: 13,
      endChar: 18,
      flagged: true,
      suggestion: null,
    });

    const decisionsRes = await client.detectDecisionsAndActions(segments);
    expect(decisionsRes.windows.length).toBeGreaterThanOrEqual(1);
    expect(decisionsRes.actionItems.length + decisionsRes.decisions.length).toBeGreaterThanOrEqual(1);

    const turns = await client.verifySpeakerTurns(segments);
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({
      prevSegmentId: 's1',
      segmentId: 's2',
      suspectSpeaker: false,
    });
    expect(turns[1]).toMatchObject({
      prevSegmentId: 's2',
      segmentId: 's3',
      suspectSpeaker: true,
    });

    // Advisory only: caller segments are never mutated.
    expect(JSON.stringify(segments)).toBe(snapshotBefore);

    await client.dispose();
    expect(workerInstance!.terminated).toBe(true);
  });

  it('terminates worker after 800 ms ack timeout when worker hangs on dispose', async () => {
    vi.useFakeTimers();
    const createdWorkers: FakeWorker[] = [];
    const client = createD1Client({
      createWorker: () => {
        const w = new FakeWorker((msg, selfWorker) => {
          if (msg.type === 'decide') {
            selfWorker.emitMessage({
              type: 'result',
              id: msg.id,
              answers: [{ type: 'noul', noul: 0.5, probabilities: [0.5, 0.5] }],
              backend: 'wasm',
            });
          }
          // Intentionally ignore `dispose` to exercise the 800 ms timeout fallback.
        });
        createdWorkers.push(w);
        return w;
      },
    });

    await client.decide([{ state: 'test', question: { type: 'noul', instructions: 'ok?' } }]);
    expect(createdWorkers).toHaveLength(1);

    const disposePromise = client.dispose();
    expect(createdWorkers[0].terminated).toBe(false);

    await vi.advanceTimersByTimeAsync(799);
    expect(createdWorkers[0].terminated).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await disposePromise;
    expect(createdWorkers[0].terminated).toBe(true);

    // Lazy client creates a fresh worker on subsequent use after dispose.
    await client.decide([{ state: 'test2', question: { type: 'noul', instructions: 'ok?' } }]);
    expect(createdWorkers).toHaveLength(2);
  });

  describe('timeouts', () => {
    const ANSWER: D1Answer = { type: 'noul', noul: 0.5, probabilities: [0.5, 0.5] };
    const REQUEST: D1DecisionRequest = {
      state: 'timeout',
      question: { type: 'noul', instructions: 'ok?' },
    };

    /** The first worker never answers (a hung session start) when `hangFirst`; later ones answer. */
    function hungThenHealthyFactory(createdWorkers: FakeWorker[], hangFirst = true) {
      return () => {
        const hangs = hangFirst && createdWorkers.length === 0;
        const w = new FakeWorker((msg, self) => {
          if (msg.type === 'decide' && !hangs) {
            self.emitMessage({ type: 'result', id: msg.id, answers: [ANSWER], backend: 'wasm' });
          }
        });
        createdWorkers.push(w);
        return w;
      };
    }

    it('rejects a decide batch with no answer after 90 s with d1:timeout, kills the worker, and recovers on the next call', async () => {
      vi.useFakeTimers();
      const createdWorkers: FakeWorker[] = [];
      const client = createD1Client({ createWorker: hungThenHealthyFactory(createdWorkers) });

      const outcome = client.decide([REQUEST]).then(
        () => 'resolved',
        (err: Error) => err.message,
      );

      createdWorkers[0].emitMessage({ type: 'boot' });
      await vi.advanceTimersByTimeAsync(D1_DECIDE_TIMEOUT_MS - 1);
      expect(createdWorkers[0].terminated).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toBe('d1:timeout');
      expect(createdWorkers[0].terminated).toBe(true);

      expect(await client.decide([REQUEST])).toEqual([ANSWER]);
      expect(createdWorkers).toHaveLength(2);
    });

    it('does not time out a batch that was answered in time', async () => {
      vi.useFakeTimers();
      const createdWorkers: FakeWorker[] = [];
      const client = createD1Client({ createWorker: hungThenHealthyFactory(createdWorkers, false) });

      const answered = client.decide([REQUEST]);
      await vi.advanceTimersByTimeAsync(D1_DECIDE_TIMEOUT_MS * 2);

      expect(await answered).toEqual([ANSWER]);
      expect(createdWorkers).toHaveLength(1);
      expect(createdWorkers[0].terminated).toBe(false);
    });

    it('terminate() kills the worker at once and rejects the call in flight', async () => {
      const createdWorkers: FakeWorker[] = [];
      const client = createD1Client({ createWorker: hungThenHealthyFactory(createdWorkers) });

      const outcome = client.decide([REQUEST]).then(
        () => 'resolved',
        (err: Error) => err.message,
      );
      await Promise.resolve();
      expect(createdWorkers).toHaveLength(1);

      client.terminate();
      expect(createdWorkers[0].terminated).toBe(true);
      expect(await outcome).toBe('D1 client terminated');
    });

    it('terminate() on an idle client is a no-op, and the next call starts a fresh worker', async () => {
      const createdWorkers: FakeWorker[] = [];
      const client = createD1Client({ createWorker: hungThenHealthyFactory(createdWorkers, false) });

      client.terminate();
      expect(createdWorkers).toHaveLength(0);

      expect(await client.decide([REQUEST])).toEqual([ANSWER]);
      client.terminate();
      expect(createdWorkers).toHaveLength(1);
      expect(createdWorkers[0].terminated).toBe(true);
    });
  });

  describe('diagnostics and failures', () => {
    const REQUEST: D1DecisionRequest = {
      state: 'diag',
      question: { type: 'noul', instructions: 'ok?' },
    };

    function startHung() {
      const createdWorkers: FakeWorker[] = [];
      const client = createD1Client({
        createWorker: () => {
          const w = new FakeWorker();
          createdWorkers.push(w);
          return w;
        },
      });
      const outcome = client.decide([REQUEST]).then(
        () => 'resolved',
        (err: Error) => err.message,
      );
      return { createdWorkers, outcome };
    }

    it('prints worker log messages in the page console', async () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      try {
        const { createdWorkers } = startHung();
        createdWorkers[0].emitMessage({ type: 'log', level: 'info', args: ['[D1] worker: booted', { crossOriginIsolated: false }] });
        expect(info).toHaveBeenCalledWith('[D1] worker: booted', { crossOriginIsolated: false });
      } finally {
        info.mockRestore();
      }
    });

    it('a worker error event rejects the call with the worker message and kills the worker', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const { createdWorkers, outcome } = startHung();
        createdWorkers[0].emitError({ message: 'Importing a module script failed.', filename: 'http://x/worker.js', lineno: 3 });
        expect(await outcome).toBe('D1 worker crashed: Importing a module script failed. (http://x/worker.js:3)');
        expect(createdWorkers[0].terminated).toBe(true);
      } finally {
        error.mockRestore();
      }
    });

    it('an unreadable worker message rejects the call and kills the worker', async () => {
      const { createdWorkers, outcome } = startHung();
      createdWorkers[0].onmessageerror?.({} as MessageEvent);
      expect(await outcome).toBe('D1 worker sent an unreadable message');
      expect(createdWorkers[0].terminated).toBe(true);
    });

    it('a worker that never posts boot is killed with "D1 worker didn\'t start"', async () => {
      vi.useFakeTimers();
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const { createdWorkers, outcome } = startHung();
        await vi.advanceTimersByTimeAsync(D1_BOOT_TIMEOUT_MS);
        expect(await outcome).toBe(D1_BOOT_ERROR);
        expect(createdWorkers[0].terminated).toBe(true);
      } finally {
        error.mockRestore();
      }
    });

    it('a boot message disarms the boot deadline', async () => {
      vi.useFakeTimers();
      const { createdWorkers } = startHung();
      createdWorkers[0].emitMessage({ type: 'boot' });
      await vi.advanceTimersByTimeAsync(D1_BOOT_TIMEOUT_MS * 2);
      expect(createdWorkers[0].terminated).toBe(false);
    });

    it('a fatal message (heavy modules failed to load) rejects with its reason and kills the worker', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const { createdWorkers, outcome } = startHung();
        createdWorkers[0].emitMessage({ type: 'boot' });
        createdWorkers[0].emitMessage({ type: 'fatal', message: 'TypeError: x is not a function' });
        expect(await outcome).toBe('D1 worker failed to load: TypeError: x is not a function');
        expect(createdWorkers[0].terminated).toBe(true);
      } finally {
        error.mockRestore();
      }
    });

    it('worker activity restarts the timeout; only a silent worker times out', async () => {
      vi.useFakeTimers();
      const { createdWorkers, outcome } = startHung();
      const worker = createdWorkers[0];
      worker.emitMessage({ type: 'boot' });

      await vi.advanceTimersByTimeAsync(D1_DECIDE_TIMEOUT_MS - 1000);
      worker.emitMessage({ type: 'log', level: 'debug', args: ['[D1] worker: still loading'] });
      await vi.advanceTimersByTimeAsync(D1_DECIDE_TIMEOUT_MS - 1000);
      expect(worker.terminated).toBe(false);

      await vi.advanceTimersByTimeAsync(1000);
      expect(await outcome).toBe('d1:timeout');
      expect(worker.terminated).toBe(true);
    });
  });

  describe('stage', () => {
    const ANSWER: D1Answer = { type: 'noul', noul: 0.5, probabilities: [0.5, 0.5] };
    const REQUEST: D1DecisionRequest = {
      state: 'stage',
      question: { type: 'noul', instructions: 'ok?' },
    };

    it('forwards worker stage messages to the stage store and clears them when the batch settles', async () => {
      const createdWorkers: FakeWorker[] = [];
      const client = createD1Client({
        createWorker: () => {
          const w = new FakeWorker();
          createdWorkers.push(w);
          return w;
        },
      });

      const answered = client.decide([REQUEST]);
      const worker = createdWorkers[0];
      const id = (worker.posted[0] as { id: string }).id;

      worker.emitMessage({ type: 'stage', id, stage: { kind: 'waiting' } });
      expect(getD1StageSnapshot()?.stage).toEqual({ kind: 'waiting' });

      worker.emitMessage({ type: 'result', id, answers: [ANSWER], backend: 'wasm' });
      expect(await answered).toEqual([ANSWER]);
      expect(getD1StageSnapshot()).toBeNull();
    });
  });
});
