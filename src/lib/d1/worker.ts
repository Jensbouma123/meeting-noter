/**
 * Dedicated module Web Worker for LiquidAI D1 (`d1-omni-600M-ONNX`).
 *
 * Owns the tokenizer, config temperatures, and `onnxruntime-web`
 * `InferenceSession`. Serializes `session.run()` with a `Mutex`, builds
 * `BigInt64Array` `int64` tensors, disposes every input/output tensor
 * immediately after copying out logits, and revokes blob URLs in `finally {}`.
 */

import { PreTrainedTokenizer } from '@huggingface/transformers';
import {
  assertD1ModelsCached,
  downloadD1Models,
  modelSource,
  readModelJson,
  revokeModelUrls,
} from './downloader';
import { d1Log, setD1LogSink } from './log';
import {
  D1_CONFIG_FILE,
  D1_GRAPH_FILE,
  D1_MAX_BATCH_SIZE,
  D1_MAX_TOKENS,
  D1_TOKENIZER_CONFIG_FILE,
  D1_TOKENIZER_FILE,
  D1_WEIGHTS_FILE,
  externalDataPath,
} from './manifest';
import {
  createSession,
  Tensor,
  type ExternalDataFile,
  type InferenceSession,
  type SessionBackend,
} from './onnx-session';
import {
  assertD1TokenizerSelfTest,
  collateD1Batch,
  decodeD1Answer,
  encodeD1Prompt,
  extractD1Temperatures,
  type D1Answer,
  type D1ConfigLike,
  type D1ResolvedTokens,
  type D1Tokenizer,
} from './prompt';
import type {
  D1DecisionRequest,
  D1WorkerErrorCode,
  D1WorkerInMessage,
  D1WorkerOutMessage,
} from './protocol';

class NotCachedError extends Error {}

/** Serializes ONNX `session.run()` and `session.release()` calls. */
class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn, fn);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export interface D1WorkerRuntime {
  session: InferenceSession;
  backend: SessionBackend;
  tokenizer: D1Tokenizer;
  tokens: D1ResolvedTokens;
  temperatures: Record<string, number>;
  config: D1ConfigLike;
}

export interface D1WorkerDeps {
  assertCached?: () => Promise<void>;
  downloadModels?: () => Promise<Record<string, string>>;
  readJson?: <T = unknown>(url: string) => Promise<T>;
  getModelSource?: (url: string) => string | Uint8Array;
  revokeUrls?: (urls: Record<string, string | undefined>) => void;
  createTokenizer?: (tokenizerJson: unknown, tokenizerConfig: unknown) => D1Tokenizer;
  createOrtSession?: (
    model: string | Uint8Array,
    externalData?: ExternalDataFile[],
  ) => Promise<{ session: InferenceSession; backend: SessionBackend }>;
  createTensor?: (type: 'int64', data: BigInt64Array, dims: readonly number[]) => Tensor;
}

function defaultCreateTokenizer(tokenizerJson: unknown, tokenizerConfig: unknown): D1Tokenizer {
  const instance = new PreTrainedTokenizer(
    tokenizerJson as Record<string, unknown>,
    tokenizerConfig as Record<string, unknown>,
  );
  return instance as unknown as D1Tokenizer;
}

function defaultCreateTensor(
  type: 'int64',
  data: BigInt64Array,
  dims: readonly number[],
): Tensor {
  return new Tensor(type, data, dims);
}

function disposeTensor(tensor: unknown): void {
  if (tensor && typeof (tensor as { dispose?: () => void }).dispose === 'function') {
    (tensor as { dispose: () => void }).dispose();
  }
}

export function createD1WorkerHandler(
  post: (message: D1WorkerOutMessage) => void,
  deps: D1WorkerDeps = {},
): (msg: D1WorkerInMessage) => Promise<void> {
  const assertCached = deps.assertCached ?? assertD1ModelsCached;
  const downloadModels = deps.downloadModels ?? (() => downloadD1Models());
  const readJson = deps.readJson ?? (<T = unknown>(url: string) => readModelJson<T>(url));
  const getModelSource = deps.getModelSource ?? modelSource;
  const revokeUrls = deps.revokeUrls ?? revokeModelUrls;
  const createTokenizer = deps.createTokenizer ?? defaultCreateTokenizer;
  const createOrtSession = deps.createOrtSession ?? createSession;
  const createTensor = deps.createTensor ?? defaultCreateTensor;

  const mutex = new Mutex();
  let runtimePromise: Promise<D1WorkerRuntime> | null = null;
  let generation = 0;

  async function loadRuntime(id: string): Promise<D1WorkerRuntime> {
    if (runtimePromise) return runtimePromise;
    const loadGeneration = generation;

    // While the model loads, say so every 10 s: the client reads any worker message as
    // proof of life, so a slow session start is not mistaken for a hung worker.
    const startedAt = Date.now();
    const heartbeat = setInterval(() => {
      d1Log('[D1] worker: still loading', { seconds: Math.round((Date.now() - startedAt) / 1000) });
    }, 10_000);

    const loading = (async () => {
      post({ type: 'stage', id, stage: { kind: 'loading' } });
      try {
        await assertCached();
        d1Log('[D1] worker: assertCached ok');
      } catch (err) {
        d1Log('[D1] worker: assertCached failed', err instanceof Error ? err.message : String(err));
        runtimePromise = null;
        throw new NotCachedError(err instanceof Error ? err.message : String(err));
      }

      let urls: Record<string, string>;
      try {
        d1Log('[D1] worker: download start');
        urls = await downloadModels();
        d1Log('[D1] worker: download urls ready');
      } catch (err) {
        runtimePromise = null;
        throw err;
      }

      let createdSession: InferenceSession | null = null;
      try {
        const config = await readJson<D1ConfigLike>(urls[D1_CONFIG_FILE.filename]);
        const tokenizerJson = await readJson<unknown>(urls[D1_TOKENIZER_FILE.filename]);
        const tokenizerConfig = await readJson<unknown>(urls[D1_TOKENIZER_CONFIG_FILE.filename]);
        d1Log('[D1] worker: config and tokenizer files read');

        const tokenizer = createTokenizer(tokenizerJson, tokenizerConfig);
        const tokens = assertD1TokenizerSelfTest(tokenizer, config);
        const temperatures = extractD1Temperatures(config);
        d1Log('[D1] worker: tokenizer ready');

        post({ type: 'stage', id, stage: { kind: 'session' } });
        const { session, backend } = await createOrtSession(
          getModelSource(urls[D1_GRAPH_FILE.filename]),
          [
            {
              path: externalDataPath(D1_WEIGHTS_FILE),
              data: getModelSource(urls[D1_WEIGHTS_FILE.filename]),
            },
          ],
        );
        createdSession = session;
        d1Log('[D1] worker: session backend', { backend });

        // If dispose() ran while loading was in flight, release immediately and abort.
        if (loadGeneration !== generation) {
          await session.release().catch(() => {});
          createdSession = null;
          throw new Error('D1 worker disposed during load');
        }

        return { session, backend, tokenizer, tokens, temperatures, config };
      } catch (err) {
        if (createdSession) {
          await createdSession.release().catch(() => {});
        }
        runtimePromise = null;
        throw err;
      } finally {
        revokeUrls(urls);
      }
    })();
    runtimePromise = loading;
    const stopHeartbeat = () => clearInterval(heartbeat);
    loading.then(stopHeartbeat, stopHeartbeat);

    return loading;
  }

  async function runBatch(
    rt: D1WorkerRuntime,
    requests: readonly D1DecisionRequest[],
    maxTokens: number,
  ): Promise<D1Answer[]> {
    const encoded = requests.map((req) =>
      encodeD1Prompt(rt.tokenizer, req.state, req.question, {
        maxTokens,
        tokens: rt.tokens,
        config: rt.config,
      }),
    );
    const batch = collateD1Batch(encoded, {
      padTokenId: rt.tokens.padTokenId,
      maxTokens,
    });

    const feeds: Record<string, Tensor> = {
      input_ids: createTensor('int64', batch.inputIds, [batch.batchSize, batch.seqLen]),
      attention_mask: createTensor('int64', batch.attentionMask, [batch.batchSize, batch.seqLen]),
      prefix_len: createTensor('int64', batch.prefixLen, [batch.batchSize]),
      marker_pos: createTensor('int64', batch.markerPos, [batch.batchSize, batch.maxMarkers]),
      marker_mask: createTensor('int64', batch.markerMask, [batch.batchSize, batch.maxMarkers]),
      qtype: createTensor('int64', batch.qtype, [batch.batchSize]),
    };

    let outputs: Record<string, Tensor> | null = null;
    try {
      outputs = await rt.session.run(feeds);
      const logitsTensor = outputs.logits ?? Object.values(outputs)[0];
      if (!logitsTensor) {
        throw new Error('D1 ONNX session returned no logits output');
      }
      const logitsData = Float32Array.from(logitsDataOf(logitsTensor));

      const answers: D1Answer[] = [];
      for (let b = 0; b < batch.batchSize; b++) {
        const offset = b * batch.maxMarkers;
        const itemLogits = logitsData.subarray(offset, offset + batch.maxMarkers);
        answers.push(decodeD1Answer(requests[b].question, itemLogits, rt.temperatures));
      }
      return answers;
    } finally {
      for (const tensor of Object.values(feeds)) {
        disposeTensor(tensor);
      }
      if (outputs) {
        for (const tensor of Object.values(outputs)) {
          disposeTensor(tensor);
        }
      }
    }
  }

  return async (msg: D1WorkerInMessage) => {
    try {
      switch (msg.type) {
        case 'init': {
          const rt = await loadRuntime(msg.id);
          post({ type: 'ready', id: msg.id, backend: rt.backend });
          return;
        }
        case 'decide': {
          const maxTokens = Math.min(msg.maxTokens ?? D1_MAX_TOKENS, D1_MAX_TOKENS);
          const requests = msg.requests;
          if (requests.length === 0) {
            const rt = await loadRuntime(msg.id);
            post({ type: 'result', id: msg.id, answers: [], backend: rt.backend });
            return;
          }
          const rt = await loadRuntime(msg.id);
          const answers: D1Answer[] = [];
          for (let i = 0; i < requests.length; i += D1_MAX_BATCH_SIZE) {
            const chunk = requests.slice(i, i + D1_MAX_BATCH_SIZE);
            const batch = Math.floor(i / D1_MAX_BATCH_SIZE) + 1;
            post({ type: 'stage', id: msg.id, stage: { kind: 'sending', batch } });
            d1Log('[D1] worker: batch', { id: msg.id, batch, size: chunk.length, maxTokens });
            const chunkAnswers = await mutex.run(() => {
              post({ type: 'stage', id: msg.id, stage: { kind: 'waiting' } });
              return runBatch(rt, chunk, maxTokens);
            });
            d1Log('[D1] worker: batch done', { id: msg.id, batch, answers: chunkAnswers.length });
            answers.push(...chunkAnswers);
          }
          post({ type: 'result', id: msg.id, answers, backend: rt.backend });
          return;
        }
        case 'dispose': {
          generation += 1;
          const pendingRuntime = runtimePromise;
          runtimePromise = null;
          await mutex.run(async () => {
            if (!pendingRuntime) return;
            try {
              const rt = await pendingRuntime;
              await rt.session.release().catch(() => {});
            } catch {
              // Ignore load errors during disposal.
            }
          });
          post({ type: 'disposed', id: msg.id });
          return;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code: D1WorkerErrorCode = err instanceof NotCachedError ? 'not-cached' : 'failed';
      d1Log('[D1] worker: error', { id: msg.id, code, message });
      post({ type: 'error', id: msg.id, message, code });
    }
  };
}

function logitsDataOf(tensor: Tensor): ArrayLike<number> {
  return tensor.data as ArrayLike<number>;
}

/** What `worker-entry.ts` hands over once the heavy modules have loaded. */
export interface D1WorkerScope {
  postMessage(message: D1WorkerOutMessage): void;
  onmessage: ((ev: MessageEvent<D1WorkerInMessage>) => void) | null;
}

/**
 * Wire the handler to the worker scope. `worker-entry.ts` calls this after its
 * dynamic import of this module, so a throw while evaluating the static imports
 * above (onnxruntime-web, transformers) is catchable there instead of vanishing.
 */
export function startD1Worker(ctx: D1WorkerScope): (msg: D1WorkerInMessage) => Promise<void> {
  // Safari lists a worker's console apart from the page's: forward every [D1] line to the page.
  setD1LogSink((args) => ctx.postMessage({ type: 'log', args }));
  const nav = (self as unknown as { navigator?: Navigator & { gpu?: unknown } }).navigator;
  d1Log('[D1] worker: booted', {
    userAgent: nav?.userAgent,
    crossOriginIsolated: (self as { crossOriginIsolated?: boolean }).crossOriginIsolated ?? false,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    webgpuApi: typeof nav === 'object' && nav !== null && 'gpu' in nav,
    indexedDB: typeof indexedDB !== 'undefined',
  });
  const handle = createD1WorkerHandler((msg) => ctx.postMessage(msg));
  // A throw outside any handled message would otherwise vanish in the worker's own console.
  self.addEventListener('unhandledrejection', (ev) => {
    d1Log('[D1] worker: unhandled rejection', (ev as PromiseRejectionEvent).reason);
  });
  return handle;
}
