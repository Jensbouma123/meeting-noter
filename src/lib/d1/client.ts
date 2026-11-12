/**
 * Lazy singleton Web Worker client for LiquidAI D1 (`d1-omni-600M-ONNX`).
 *
 * Exposes `triageLowConfidence()`, `detectDecisionsAndActions()`,
 * `verifySpeakerTurns()`, and `dispose()` (which posts `dispose` to the
 * worker, waits up to 800 ms for ack, and falls back to `worker.terminate()`).
 * `terminate()` kills the worker at once, without the ack. A decide batch
 * with no answer after 90 s rejects with `d1:timeout` and kills the worker.
 */

import { D1_MAX_BATCH_SIZE, D1_MAX_TOKENS } from './manifest';
import { escapeD1Text, type D1Answer, type D1Question } from './prompt';
import type {
  D1DecisionRequest,
  D1DecisionsResult,
  D1DetectedActionItem,
  D1DetectedDecision,
  D1SegmentInput,
  D1TriageResult,
  D1TriageSpanResult,
  D1TurnVerificationResult,
  D1WindowClassification,
  D1WindowLabel,
  D1WorkerInMessage,
  D1WorkerOutMessage,
} from './protocol';

export const D1_DISPOSE_TIMEOUT_MS = 800;
/** A decide batch with no answer by then means the worker is hung (e.g. a stalled session start). */
export const D1_DECIDE_TIMEOUT_MS = 90_000;
/** Message of the error a timed-out decide batch rejects with. */
export const D1_TIMEOUT_ERROR = 'd1:timeout';
const DEFAULT_TRIAGE_THRESHOLD = 0.65;
const DEFAULT_DECISION_THRESHOLD = 0.55;
const DEFAULT_TURN_THRESHOLD = 0.65;
const MAX_STATE_CHARS = 2400;

export interface WorkerLike {
  postMessage(message: D1WorkerInMessage): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (ev: MessageEvent<D1WorkerOutMessage>) => void): void;
  removeEventListener(
    type: 'message',
    listener: (ev: MessageEvent<D1WorkerOutMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (ev: Event) => void): void;
  removeEventListener(type: 'error', listener: (ev: Event) => void): void;
}

export interface D1ClientOptions {
  createWorker?: () => WorkerLike;
  disposeTimeoutMs?: number;
  decideTimeoutMs?: number;
  maxTokens?: number;
}

export interface TriageOptions {
  /** Only inspect segments with `lowConfSpans` (default: `true`). */
  onlyLowConfSpans?: boolean;
  /** Probability threshold above which a span/segment is flagged (default: `0.65`). */
  threshold?: number;
}

export interface DecisionsOptions {
  /** Sliding window size in segments, clamped to 3..5 (default: `4`). */
  windowSize?: number;
  /** Sliding stride in segments (default: `3`). */
  stride?: number;
  /** Minimum `noul` confirmation probability for decisions/action items (default: `0.55`). */
  threshold?: number;
}

export interface VerifyTurnsOptions {
  /** Check all adjacent segment pairs, not only speaker transitions (default: `false`). */
  checkAllAdjacent?: boolean;
  /** Probability threshold for marking `suspectSpeaker` (default: `0.65`). */
  threshold?: number;
}

export interface D1Client {
  decide(requests: readonly D1DecisionRequest[]): Promise<D1Answer[]>;
  triageLowConfidence(
    segments: readonly D1SegmentInput[],
    options?: TriageOptions,
  ): Promise<D1TriageResult[]>;
  detectDecisionsAndActions(
    segments: readonly D1SegmentInput[],
    options?: DecisionsOptions,
  ): Promise<D1DecisionsResult>;
  verifySpeakerTurns(
    segments: readonly D1SegmentInput[],
    options?: VerifyTurnsOptions,
  ): Promise<D1TurnVerificationResult[]>;
  /** Graceful shutdown: asks the worker to release its session, then terminates it. */
  dispose(): Promise<void>;
  /** Hard kill: terminates the worker now and rejects any pending call. */
  terminate(): void;
}

function defaultCreateWorker(): WorkerLike {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are unavailable in this environment');
  }
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
}

function clipText(text: string, maxChars: number = MAX_STATE_CHARS): string {
  const escaped = escapeD1Text(text.trim());
  if (escaped.length <= maxChars) return escaped;
  return `${escaped.slice(0, maxChars - 1)}…`;
}

function formatSegmentLine(seg: D1SegmentInput): string {
  return `${escapeD1Text(seg.speaker || 'Speaker')}: ${escapeD1Text(seg.text.trim())}`;
}

function formatWindowText(segments: readonly D1SegmentInput[]): string {
  return clipText(segments.map((s, idx) => `[${idx}] ${formatSegmentLine(s)}`).join('\n'));
}

const TRIAGE_SCORE_QUESTION: D1Question = {
  type: 'score',
  instructions:
    'Rate whether the [Target] transcript segment is coherent, grammatical speech vs corrupted or misheard ASR output.',
  criteria: [
    'Severely garbled or nonsensical speech recognition errors',
    'Contains likely misheard words or broken phrasing',
    'Mostly coherent with minor awkwardness',
    'Completely fluent and natural speech',
  ],
};

const TRIAGE_SPAN_NOUL_QUESTION: D1Question = {
  type: 'noul',
  instructions:
    'Does the [Flagged span] in the [Target] transcript segment appear to be a speech recognition error, garbled word, or wrong-language fragment?',
  criteria: {
    false: 'no, the flagged span makes sense in context',
    true: 'yes, the flagged span looks misheard or garbled',
  },
};

const DECISION_CHOICE_QUESTION: D1Question = {
  type: 'choice',
  instructions: 'Classify the primary outcome of this meeting transcript excerpt.',
  criteria: {
    decision: 'Participants agreed on or finalized a concrete decision',
    action_item: 'Someone committed to or was assigned a follow-up task',
    question: 'An open question was raised without resolution',
    blocker: 'A blocker, risk, or dependency was identified',
    discussion: 'General discussion without a decision or action item',
  },
};

const CONFIRM_DECISION_QUESTION: D1Question = {
  type: 'noul',
  instructions:
    'Did participants clearly agree on or finalize a concrete decision in this transcript excerpt?',
  criteria: {
    false: 'no clear decision was agreed upon',
    true: 'yes, a decision was agreed upon or finalized',
  },
};

const CONFIRM_ACTION_QUESTION: D1Question = {
  type: 'noul',
  instructions:
    'Did someone commit to or receive a concrete action item or follow-up task in this transcript excerpt?',
  criteria: {
    false: 'no concrete action item or task was assigned',
    true: 'yes, a concrete action item or follow-up task was assigned',
  },
};

const TURN_CONTINUATION_QUESTION: D1Question = {
  type: 'noul',
  instructions:
    'Could [Segment B] be a direct continuation by the same speaker as [Segment A], rather than a response from a different speaker?',
  criteria: {
    false: 'no, Segment B is a response or turn from a different speaker',
    true: 'yes, Segment B reads like a continuation by the same speaker',
  },
};

interface PendingRequest {
  kind: 'decide' | 'dispose';
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

export function createD1Client(options: D1ClientOptions = {}): D1Client {
  const workerFactory = options.createWorker ?? defaultCreateWorker;
  const disposeTimeoutMs = options.disposeTimeoutMs ?? D1_DISPOSE_TIMEOUT_MS;
  const decideTimeoutMs = options.decideTimeoutMs ?? D1_DECIDE_TIMEOUT_MS;
  const maxTokens = Math.min(options.maxTokens ?? D1_MAX_TOKENS, D1_MAX_TOKENS);

  let worker: WorkerLike | null = null;
  let nextId = 0;
  let disposingPromise: Promise<void> | null = null;
  const pending = new Map<string, PendingRequest>();

  const onMessage = (ev: MessageEvent<D1WorkerOutMessage>) => {
    const msg = ev.data;
    if (!msg || !msg.id) return;
    const entry = pending.get(msg.id);
    if (!entry) return;

    if (msg.type === 'result' && entry.kind === 'decide') {
      pending.delete(msg.id);
      entry.resolve(msg.answers);
      return;
    }
    if (msg.type === 'disposed' && entry.kind === 'dispose') {
      pending.delete(msg.id);
      entry.resolve(undefined);
      return;
    }
    if (msg.type === 'error') {
      pending.delete(msg.id);
      entry.reject(new Error(msg.message));
    }
  };

  const rejectAllPending = (reason: string) => {
    for (const [id, entry] of pending) {
      if (entry.kind === 'dispose') {
        entry.resolve(undefined);
      } else {
        entry.reject(new Error(reason));
      }
      pending.delete(id);
    }
  };

  /** Detach from the current worker, terminate it, and reject everything in flight. */
  const killWorker = (reason: string) => {
    const active = worker;
    worker = null;
    if (active) {
      active.removeEventListener('message', onMessage);
      active.removeEventListener('error', onError);
      active.terminate();
    }
    rejectAllPending(reason);
  };

  const onError = () => killWorker('D1 worker crashed');

  function ensureWorker(): WorkerLike {
    if (!worker) {
      const created = workerFactory();
      created.addEventListener('message', onMessage);
      created.addEventListener('error', onError);
      worker = created;
    }
    return worker;
  }

  function postDecideBatch(requests: readonly D1DecisionRequest[]): Promise<D1Answer[]> {
    const activeWorker = ensureWorker();
    const id = `d1-${++nextId}`;
    return new Promise<D1Answer[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending.delete(id)) return;
        reject(new Error(D1_TIMEOUT_ERROR));
        killWorker(D1_TIMEOUT_ERROR);
      }, decideTimeoutMs);
      pending.set(id, {
        kind: 'decide',
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val as D1Answer[]);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      activeWorker.postMessage({
        type: 'decide',
        id,
        requests: [...requests],
        maxTokens,
      });
    });
  }

  async function decide(requests: readonly D1DecisionRequest[]): Promise<D1Answer[]> {
    if (requests.length === 0) return [];
    if (disposingPromise) {
      await disposingPromise;
    }
    const answers: D1Answer[] = [];
    for (let i = 0; i < requests.length; i += D1_MAX_BATCH_SIZE) {
      const batch = requests.slice(i, i + D1_MAX_BATCH_SIZE);
      const batchAnswers = await postDecideBatch(batch);
      answers.push(...batchAnswers);
    }
    return answers;
  }

  async function triageLowConfidence(
    segments: readonly D1SegmentInput[],
    opts: TriageOptions = {},
  ): Promise<D1TriageResult[]> {
    const onlyLowConfSpans = opts.onlyLowConfSpans ?? true;
    const threshold = opts.threshold ?? DEFAULT_TRIAGE_THRESHOLD;

    interface TargetMeta {
      segment: D1SegmentInput;
      spans: Array<{ startChar: number; endChar: number; conf: number }>;
      scoreReqIdx: number;
      spanReqIndices: number[];
    }

    const requests: D1DecisionRequest[] = [];
    const targets: TargetMeta[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const rawSpans = seg.lowConfSpans ?? [];
      if (onlyLowConfSpans && rawSpans.length === 0) continue;

      const contextLines: string[] = [];
      if (i > 0) contextLines.push(`[Previous] ${formatSegmentLine(segments[i - 1])}`);
      contextLines.push(`[Target] ${formatSegmentLine(seg)}`);
      if (i + 1 < segments.length) contextLines.push(`[Next] ${formatSegmentLine(segments[i + 1])}`);
      const baseState = clipText(contextLines.join('\n'));

      const scoreReqIdx = requests.length;
      requests.push({ state: baseState, question: TRIAGE_SCORE_QUESTION });

      const spanReqIndices: number[] = [];
      const spans: Array<{ startChar: number; endChar: number; conf: number }> = [];

      if (rawSpans.length > 0) {
        for (const [startChar, endChar, conf] of rawSpans) {
          const spanText = seg.text.slice(startChar, endChar).trim() || seg.text.trim();
          const spanState = clipText(
            `${baseState}\n[Flagged span] "${escapeD1Text(spanText)}" (confidence: ${conf.toFixed(2)})`,
          );
          spanReqIndices.push(requests.length);
          spans.push({ startChar, endChar, conf });
          requests.push({ state: spanState, question: TRIAGE_SPAN_NOUL_QUESTION });
        }
      } else {
        spanReqIndices.push(requests.length);
        spans.push({ startChar: 0, endChar: seg.text.length, conf: 0 });
        requests.push({
          state: clipText(`${baseState}\n[Flagged span] "${escapeD1Text(seg.text.trim())}"`),
          question: TRIAGE_SPAN_NOUL_QUESTION,
        });
      }

      targets.push({ segment: seg, spans, scoreReqIdx, spanReqIndices });
    }

    if (requests.length === 0) return [];
    const answers = await decide(requests);

    return targets.map((target) => {
      const scoreAns = answers[target.scoreReqIdx];
      const coherenceScore = scoreAns.type === 'score' ? scoreAns.score / 3 : 0;

      const reviewedSpans: D1TriageSpanResult[] = target.spans.map((span, idx) => {
        const spanAns = answers[target.spanReqIndices[idx]];
        const errorProbability = spanAns.type === 'noul' ? spanAns.noul : 0;
        return {
          startChar: span.startChar,
          endChar: span.endChar,
          conf: span.conf,
          errorProbability,
          coherenceScore,
          flagged: errorProbability >= threshold,
          suggestion: null,
        };
      });

      const maxError = reviewedSpans.reduce(
        (max, span) => Math.max(max, span.errorProbability),
        0,
      );
      return {
        segmentId: target.segment.id,
        errorProbability: maxError,
        coherenceScore,
        flagged: maxError >= threshold,
        reviewedSpans,
      };
    });
  }

  async function detectDecisionsAndActions(
    segments: readonly D1SegmentInput[],
    opts: DecisionsOptions = {},
  ): Promise<D1DecisionsResult> {
    const nonEmpty = segments.filter((s) => s.text.trim().length > 0);
    if (nonEmpty.length === 0) {
      return { decisions: [], actionItems: [], windows: [] };
    }

    const windowSize = Math.max(3, Math.min(opts.windowSize ?? 4, 5));
    const stride = Math.max(1, opts.stride ?? 3);
    const threshold = opts.threshold ?? DEFAULT_DECISION_THRESHOLD;

    const windowsList: D1SegmentInput[][] = [];
    if (nonEmpty.length <= windowSize) {
      windowsList.push([...nonEmpty]);
    } else {
      for (let start = 0; start < nonEmpty.length; start += stride) {
        const slice = nonEmpty.slice(start, start + windowSize);
        if (slice.length > 0) windowsList.push(slice);
        if (start + windowSize >= nonEmpty.length) break;
      }
    }

    const windowStates = windowsList.map((w) => formatWindowText(w));
    const choiceAnswers = await decide(
      windowStates.map((state) => ({ state, question: DECISION_CHOICE_QUESTION })),
    );

    const windows: D1WindowClassification[] = [];
    const confirmRequests: D1DecisionRequest[] = [];
    const confirmMeta: Array<{
      windowIdx: number;
      kind: 'decision' | 'action_item';
    }> = [];

    for (let i = 0; i < windowsList.length; i++) {
      const ans = choiceAnswers[i];
      if (ans.type !== 'choice') continue;
      const winSegs = windowsList[i];
      const label = ans.choice as D1WindowLabel;
      windows.push({
        segmentIds: winSegs.map((s) => s.id),
        start: winSegs[0].start,
        label,
        confidence: ans.confidence,
        probabilities: ans.probabilities,
      });

      if (label === 'decision' || (ans.probabilities.decision ?? 0) >= 0.25) {
        confirmMeta.push({ windowIdx: i, kind: 'decision' });
        confirmRequests.push({ state: windowStates[i], question: CONFIRM_DECISION_QUESTION });
      }
      if (label === 'action_item' || (ans.probabilities.action_item ?? 0) >= 0.25) {
        confirmMeta.push({ windowIdx: i, kind: 'action_item' });
        confirmRequests.push({ state: windowStates[i], question: CONFIRM_ACTION_QUESTION });
      }
    }

    const confirmAnswers = confirmRequests.length > 0 ? await decide(confirmRequests) : [];
    const decisions: D1DetectedDecision[] = [];
    const actionItems: D1DetectedActionItem[] = [];

    for (let i = 0; i < confirmMeta.length; i++) {
      const meta = confirmMeta[i];
      const ans = confirmAnswers[i];
      if (ans?.type !== 'noul' || ans.noul < threshold) continue;

      const winSegs = windowsList[meta.windowIdx];
      const summaryText = winSegs.map((s) => s.text.trim()).join(' ');
      const segmentIds = winSegs.map((s) => s.id);
      const start = winSegs[0].start;

      if (meta.kind === 'decision') {
        decisions.push({
          text: summaryText,
          segmentIds,
          start,
          confidence: ans.noul,
        });
      } else {
        const owners = new Set(winSegs.map((s) => s.speaker).filter(Boolean));
        actionItems.push({
          text: summaryText,
          segmentIds,
          start,
          owner: owners.size === 1 ? [...owners][0] : null,
          confidence: ans.noul,
        });
      }
    }

    return { decisions, actionItems, windows };
  }

  async function verifySpeakerTurns(
    segments: readonly D1SegmentInput[],
    opts: VerifyTurnsOptions = {},
  ): Promise<D1TurnVerificationResult[]> {
    const checkAll = opts.checkAllAdjacent ?? false;
    const threshold = opts.threshold ?? DEFAULT_TURN_THRESHOLD;

    const pairs: Array<{ prev: D1SegmentInput; curr: D1SegmentInput }> = [];
    const requests: D1DecisionRequest[] = [];

    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];
      if (!prev.text.trim() || !curr.text.trim()) continue;
      if (!checkAll && prev.speaker === curr.speaker) continue;

      pairs.push({ prev, curr });
      requests.push({
        state: clipText(
          `[Segment A (${escapeD1Text(prev.speaker)})]: ${escapeD1Text(prev.text.trim())}\n` +
            `[Segment B (${escapeD1Text(curr.speaker)})]: ${escapeD1Text(curr.text.trim())}`,
        ),
        question: TURN_CONTINUATION_QUESTION,
      });
    }

    if (requests.length === 0) return [];
    const answers = await decide(requests);

    return pairs.map(({ prev, curr }, idx) => {
      const ans = answers[idx];
      const sameSpeakerProbability = ans?.type === 'noul' ? ans.noul : 0;
      return {
        segmentId: curr.id,
        prevSegmentId: prev.id,
        sameSpeakerProbability,
        suspectSpeaker: sameSpeakerProbability >= threshold,
      };
    });
  }

  async function dispose(): Promise<void> {
    if (disposingPromise) return disposingPromise;
    const activeWorker = worker;
    if (!activeWorker) return;

    disposingPromise = (async () => {
      // Reject any pending inference requests immediately before closing.
      for (const [id, entry] of pending) {
        if (entry.kind === 'decide') {
          pending.delete(id);
          entry.reject(new Error('D1 client disposed'));
        }
      }

      const id = `d1-dispose-${++nextId}`;
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        await new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            pending.delete(id);
            resolve();
          }, disposeTimeoutMs);

          pending.set(id, {
            kind: 'dispose',
            resolve: () => resolve(),
            reject: () => resolve(),
          });

          try {
            activeWorker.postMessage({ type: 'dispose', id });
          } catch {
            pending.delete(id);
            resolve();
          }
        });
      } finally {
        if (timer !== null) clearTimeout(timer);
        activeWorker.removeEventListener('message', onMessage);
        activeWorker.removeEventListener('error', onError);
        activeWorker.terminate();
        if (worker === activeWorker) {
          worker = null;
        }
        disposingPromise = null;
      }
    })();

    return disposingPromise;
  }

  function terminate(): void {
    killWorker('D1 client terminated');
  }

  return {
    decide,
    triageLowConfidence,
    detectDecisionsAndActions,
    verifySpeakerTurns,
    dispose,
    terminate,
  };
}

let singletonClient: D1Client | null = null;

export function getD1Client(): D1Client {
  singletonClient ??= createD1Client();
  return singletonClient;
}

/** Lazy singleton client used across the application. */
export const d1Client: D1Client = {
  decide: (requests) => getD1Client().decide(requests),
  triageLowConfidence: (segments, options) => getD1Client().triageLowConfidence(segments, options),
  detectDecisionsAndActions: (segments, options) =>
    getD1Client().detectDecisionsAndActions(segments, options),
  verifySpeakerTurns: (segments, options) => getD1Client().verifySpeakerTurns(segments, options),
  dispose: () => (singletonClient ? singletonClient.dispose() : Promise.resolve()),
  terminate: () => singletonClient?.terminate(),
};
