/**
 * Bridges LiquidAI D1 (`src/lib/d1`) into the meeting lifecycle and the
 * shared model registry:
 *
 * - Registers `d1-omni-600m` (`kind: 'decisions'`, `preCheckCache: true`) in
 *   `model-registry.ts` so it never blocks Record and shares the download/consent UI.
 * - Runs batched, incremental, resumable post-stop D1 passes (low-confidence span
 *   adjudication, sliding 3-5 segment windows for decisions/action items, and
 *   advisory speaker-turn coherence checks) only while capture is `idle` and
 *   never concurrently with `indexMeeting()` (`EmbeddingGemma 2`).
 * - Disposes the D1 worker cleanly on `releaseD1ForCapture()` (called on
 *   `meeting.start()` and `meeting.release()`) and after 2 minutes of idle.
 */

import {
  getModelStatus,
  isConsentGiven,
  markNotCached,
  registerDownloadHandler,
  registerModel,
  type AsrBackend,
} from '@/lib/asr/browser';
import {
  assertD1ModelsCached,
  D1_MAX_BATCH_SIZE,
  D1_OMNI_REPO,
  D1_TEXT_FILES,
  D1_TOTAL_SIZE_BYTES,
  d1Client,
  ensureD1ModelsCached,
  type D1Client,
  type D1SegmentInput,
} from '@/lib/d1';
import {
  getIntelligenceSnapshot,
  getSessionIntelligence,
  hashSegmentText,
  resetIntelligenceRunState,
  triageKey,
  updateSessionIntelligence,
} from '@/lib/d1/store';
import { getState } from './store';
import type {
  MeetingActionItem,
  MeetingDecisionItem,
  Segment,
  SegmentTriage,
  SessionIntelligence,
  Speaker,
  Status,
} from './types';

export const D1_REGISTRY_KEY = 'd1-omni-600m';
export const D1_REGISTRY_IDENTITY = `${D1_OMNI_REPO}:${D1_TEXT_FILES.map((f) => f.filename).join('+')}`;
export const D1_IDLE_DISPOSE_MS = 2 * 60 * 1000;

const DECISION_WINDOW_SIZE = 4;
const DECISION_WINDOW_STRIDE = 3;
const WINDOWS_PER_BATCH = 4;

let downloadHandlerRegistered = false;

/**
 * Register LiquidAI D1 (`d1-omni-600m`) in the shared download/consent
 * registry and wire its `'decisions'` download handler. Safe to call repeatedly.
 */
export function registerD1Model(backend: AsrBackend = 'webgpu'): void {
  if (!downloadHandlerRegistered) {
    registerDownloadHandler('decisions', async (onProgress) => {
      await ensureD1ModelsCached((_file, p) => onProgress(p));
    });
    downloadHandlerRegistered = true;
  }

  registerModel({
    key: D1_REGISTRY_KEY,
    modelRepo: D1_REGISTRY_IDENTITY,
    displayName: 'Meeting insights (LiquidAI D1)',
    estimatedSizeBytes: D1_TOTAL_SIZE_BYTES,
    description:
      'Adjudicates uncertain words, extracts decisions and action items, and surfaces advisory speaker hints after recording stops. Optional (~388 MiB), run on your device.',
    preCheckCache: true,
    backend,
    kind: 'decisions',
  });
}

/** True when D1 is marked cached in the model registry. */
export function isD1ModelCached(): boolean {
  return getModelStatus(D1_REGISTRY_KEY)?.status === 'cached';
}

/** True when D1 is both cached and consented by the user. */
export function isD1ModelCachedAndConsented(): boolean {
  return isD1ModelCached() && isConsentGiven(D1_REGISTRY_KEY);
}

/* ------------------------------------------------------------------ */
/* Mutual exclusion, idle disposal, and capture handoff               */
/* ------------------------------------------------------------------ */

let activeController: AbortController | null = null;
let activeRunPromise: Promise<SessionIntelligence | null> | null = null;
let activeClient: D1Client = d1Client;
let activeSessionId: string | null = null;
/** Bumped by every Stop; a run that started under an older epoch stops writing state. */
let cancelEpoch = 0;
let idleDisposeTimer: ReturnType<typeof setTimeout> | null = null;

let semanticIndexDepth = 0;
let semanticIndexPromise: Promise<unknown> | null = null;

function clearIdleDisposeTimer(): void {
  if (idleDisposeTimer !== null) {
    clearTimeout(idleDisposeTimer);
    idleDisposeTimer = null;
  }
}

function scheduleIdleDispose(client: D1Client, delayMs: number): void {
  clearIdleDisposeTimer();
  if (delayMs <= 0) {
    void client.dispose();
    return;
  }
  idleDisposeTimer = setTimeout(() => {
    idleDisposeTimer = null;
    void client.dispose();
  }, delayMs);
}

/**
 * Run a semantic-indexing operation (`indexMeeting`) mutually exclusively
 * with any D1 scan so `EmbeddingGemma 2` and `LiquidAI D1` workers never run
 * simultaneously.
 */
export async function runSemanticIndexingSerialized<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for any in-flight semantic indexing first.
  while (semanticIndexPromise) {
    await semanticIndexPromise.catch(() => {});
  }
  // Wait for any active D1 scan to finish or abort before starting EmbeddingGemma 2.
  if (activeRunPromise) {
    await activeRunPromise.catch(() => {});
  }

  semanticIndexDepth += 1;
  const run = fn();
  semanticIndexPromise = run;
  try {
    return await run;
  } finally {
    semanticIndexDepth = Math.max(0, semanticIndexDepth - 1);
    if (semanticIndexPromise === run) {
      semanticIndexPromise = null;
    }
  }
}

/**
 * Abort any active D1 scan, dispose the D1 worker (awaiting ack up to 800 ms
 * before terminating it), and guarantee zero D1 worker memory remains before
 * capture/ASR starts or the meeting view tears down.
 */
export async function releaseD1ForCapture(): Promise<void> {
  clearIdleDisposeTimer();
  const controller = activeController;
  const runPromise = activeRunPromise;
  const client = activeClient;

  if (controller) {
    controller.abort();
  }

  await Promise.all([
    client.dispose().catch(() => {}),
    client !== d1Client ? d1Client.dispose().catch(() => {}) : Promise.resolve(),
  ]);

  if (runPromise) {
    await runPromise.catch(() => {});
  }
}

/**
 * Cancel the D1 scan running for `sessionId` (no-op for other sessions):
 * abort it, dispose the worker, and reset the stored status to `idle`. If no
 * run is live, a stale `running` record for the session is reset as well.
 */
export async function cancelD1Analysis(sessionId: string): Promise<void> {
  if (!sessionId) return;
  console.info('[D1] cancel: stop requested', { sessionId, live: activeSessionId === sessionId });
  clearIdleDisposeTimer();
  cancelEpoch += 1;
  if (activeController && activeSessionId === sessionId) {
    activeController.abort();
    activeController = null;
    activeSessionId = null;
    activeRunPromise = null;
  }
  // Hard-kill every D1 worker without waiting for acks or the hung run.
  activeClient.terminate();
  if (activeClient !== d1Client) d1Client.terminate();
  // Reset the UI state at once; the persisted write is not awaited so Stop stays instant.
  void resetIntelligenceRunState(sessionId);
  console.info('[D1] cancel: worker terminated, state reset to idle');
}

/**
 * Reset a `running` record to `idle` when no D1 run is live (e.g. the app
 * reloaded or the scan was killed mid-run), so Scan is not stuck disabled.
 * The view resets synchronously; the returned promise settles once the idle
 * record is persisted (bounded at 4 s), so a reload cannot bring back `running`.
 * Reads the in-memory view only: no IndexedDB read, so a hung backend cannot
 * block the reset itself.
 */
export async function recoverStaleD1Run(sessionId: string): Promise<void> {
  if (!sessionId || activeRunPromise !== null) return;
  if (getIntelligenceSnapshot(sessionId).status !== 'running') return;
  await resetIntelligenceRunState(sessionId);
}

/* ------------------------------------------------------------------ */
/* Helpers for batched D1 passes                                      */
/* ------------------------------------------------------------------ */

/** `SessionIntelligence.error` codes for a manual scan that could not start; the UI maps them to text. */
export const D1_ERR_NO_SEGMENTS = 'd1:no-segments';
export const D1_ERR_CAPTURE_ACTIVE = 'd1:capture-active';
export const D1_ERR_INDEXING_BUSY = 'd1:indexing-busy';
export const D1_ERR_MODEL_MISSING = 'd1:model-missing';
/** A D1 client call did not settle in time (hung worker); the worker is disposed. */
export const D1_ERR_TIMEOUT = 'd1:timeout';

/** Per-call timeout for D1 worker calls after the model has booted. */
export const D1_CALL_TIMEOUT_MS = 120 * 1000;
/** Timeout for the first D1 call of a run, which includes the model load. */
export const D1_BOOT_TIMEOUT_MS = 240 * 1000;

export interface RunD1AnalysisOptions {
  /** Per-call timeout override in ms (for unit tests). */
  callTimeoutMs?: number;
  /** First-call (boot) timeout override in ms (for unit tests). */
  bootTimeoutMs?: number;
  /** Override D1 worker client (for unit tests). */
  client?: D1Client;
  /** Override capture status check (for unit tests). */
  getStatus?: () => Status;
  /** Override cache check (for unit tests). */
  isModelCached?: () => boolean | Promise<boolean>;
  /** Override IndexedDB file cache assertion (for unit tests). */
  assertCached?: () => Promise<void>;
  /** Override concurrent semantic-indexing check (for unit tests). */
  isIndexingActive?: () => boolean;
  /** Re-run even when all segments already have matching text hashes. */
  force?: boolean;
  /** Idle disposal delay in ms (defaults to 2 minutes). */
  idleDisposeMs?: number;
}

function speakerLabelFor(seg: Segment, speakers: Record<string, Speaker>): string {
  const label = speakers[seg.speaker]?.label?.trim();
  return label && label.length > 0 ? label : seg.speaker;
}

function toD1SegmentInput(seg: Segment, speakerName: string): D1SegmentInput {
  return {
    id: seg.id,
    speaker: speakerName,
    text: seg.text,
    start: seg.start,
    end: seg.end,
    lowConfSpans: seg.lowConfSpans,
  };
}

interface WindowBatch {
  startSegmentIdx: number;
  endSegmentIdx: number;
  windowCount: number;
}

function countSlidingWindows(segmentCount: number): number {
  if (segmentCount === 0) return 0;
  if (segmentCount <= DECISION_WINDOW_SIZE) return 1;
  let count = 0;
  for (let start = 0; start < segmentCount; start += DECISION_WINDOW_STRIDE) {
    count += 1;
    if (start + DECISION_WINDOW_SIZE >= segmentCount) break;
  }
  return count;
}

function buildWindowBatches(segmentCount: number): WindowBatch[] {
  if (segmentCount === 0) return [];
  if (segmentCount <= DECISION_WINDOW_SIZE) {
    return [{ startSegmentIdx: 0, endSegmentIdx: segmentCount, windowCount: 1 }];
  }
  const batches: WindowBatch[] = [];
  const advance = WINDOWS_PER_BATCH * DECISION_WINDOW_STRIDE;
  for (let chunkStart = 0; chunkStart < segmentCount; chunkStart += advance) {
    const chunkEnd = Math.min(
      segmentCount,
      chunkStart + (WINDOWS_PER_BATCH - 1) * DECISION_WINDOW_STRIDE + DECISION_WINDOW_SIZE,
    );
    const sliceLen = chunkEnd - chunkStart;
    batches.push({
      startSegmentIdx: chunkStart,
      endSegmentIdx: chunkEnd,
      windowCount: countSlidingWindows(sliceLen),
    });
    if (chunkEnd >= segmentCount) break;
  }
  return batches;
}

interface TransitionBatch {
  startIdx: number;
  endIdx: number;
  pairCount: number;
}

function buildTransitionBatches(segments: readonly Segment[]): TransitionBatch[] {
  const batches: TransitionBatch[] = [];
  let batchStart = -1;
  let pairCount = 0;

  for (let i = 1; i < segments.length; i++) {
    if (segments[i - 1].speaker === segments[i].speaker) continue;
    if (batchStart < 0) batchStart = i - 1;
    pairCount += 1;
    if (pairCount >= D1_MAX_BATCH_SIZE) {
      batches.push({ startIdx: batchStart, endIdx: i, pairCount });
      batchStart = -1;
      pairCount = 0;
    }
  }
  if (batchStart >= 0 && pairCount > 0) {
    batches.push({ startIdx: batchStart, endIdx: segments.length - 1, pairCount });
  }
  return batches;
}

function mergeById<T extends { id: string }>(existing: readonly T[], incoming: readonly T[]): T[] {
  if (incoming.length === 0) return [...existing];
  const map = new Map<string, T>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

function decisionId(segmentIds: readonly string[], text: string): string {
  return `dec-${hashSegmentText(`${segmentIds.join(',')}:${text}`)}`;
}

function actionItemId(segmentIds: readonly string[], text: string): string {
  return `act-${hashSegmentText(`${segmentIds.join(',')}:${text}`)}`;
}

function isAbortError(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  if (!(err instanceof Error)) return false;
  return /disposed|abort/i.test(err.message);
}

/**
 * Race a D1 client call against a timeout and the run's abort signal. Rejects
 * with `D1_ERR_TIMEOUT` when the timer wins and aborts immediately on cancel,
 * so a hung worker never leaves the scan stuck in `running`.
 */
function withTimeout<T>(promise: Promise<T>, signal: AbortSignal, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('D1 analysis aborted'));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onAbort = (): void => {
      if (timer !== null) clearTimeout(timer);
      reject(new Error('D1 analysis aborted'));
    };
    timer = setTimeout(() => {
      timer = null;
      signal.removeEventListener('abort', onAbort);
      reject(new Error(D1_ERR_TIMEOUT));
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        if (timer !== null) clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        if (timer !== null) clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/* Main D1 post-stop analysis orchestrator                            */
/* ------------------------------------------------------------------ */

/**
 * Run batched, incremental D1 analysis for a finished session:
 * 1. Low-confidence span adjudication (only segments with `lowConfSpans`),
 * 2. Sliding 3-5 segment windows for decisions and action items,
 * 3. Advisory speaker-turn coherence check (`suspectSpeaker`).
 *
 * Persists incrementally to `mn-intelligence-db`, skips segments whose
 * `(segmentId, textHash)` was already analyzed, refuses to run while capture is
 * active or concurrently with `indexMeeting()`, and schedules a 2-minute idle
 * `d1Client.dispose()`.
 */
export async function runD1AnalysisForSession(
  sessionId: string,
  segments: readonly Segment[],
  speakers: Record<string, Speaker>,
  options: RunD1AnalysisOptions = {},
): Promise<SessionIntelligence | null> {
  if (!sessionId) return null;

  // Saved meetings load segments without a `final` flag; only an explicit
  // `false` marks a partial.
  const finalSegments = segments.filter((s) => s.final !== false && s.text.trim().length > 0);

  const rawStatus = options.getStatus ?? (() => getState().status);
  // A capture that ended in `error` holds no resources; only a live one blocks.
  const getStatus = (): Status => {
    const st = rawStatus();
    return st === 'error' ? 'idle' : st;
  };
  const manual = options.force === true;
  /** Record why a manual scan did nothing, so the UI never shows a dead click. */
  const bail = async (code: string): Promise<null> => {
    if (manual) {
      await updateSessionIntelligence(sessionId, (cur) => ({ ...cur, status: 'error', error: code })).catch(() => {});
    }
    return null;
  };
  if (finalSegments.length === 0) return bail(D1_ERR_NO_SEGMENTS);
  if (getStatus() !== 'idle') return bail(D1_ERR_CAPTURE_ACTIVE);

  // Show "running" immediately: the checks below can await IndexedDB.
  if (manual) {
    await updateSessionIntelligence(sessionId, (cur) => ({ ...cur, status: 'running', error: null })).catch(() => {});
  }

  // Serialize behind any in-flight semantic indexing (`EmbeddingGemma 2`).
  if (semanticIndexPromise) {
    await semanticIndexPromise.catch(() => {});
  }
  if (semanticIndexDepth > 0 || options.isIndexingActive?.()) {
    return bail(D1_ERR_INDEXING_BUSY);
  }
  if (getStatus() !== 'idle') return bail(D1_ERR_CAPTURE_ACTIVE);

  // Check model cache before spawning any D1 worker.
  const cached = options.isModelCached
    ? await options.isModelCached()
    : isD1ModelCached();
  if (!cached) return bail(D1_ERR_MODEL_MISSING);

  if (options.assertCached) {
    try {
      await options.assertCached();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'LiquidAI D1 model is not downloaded';
      markNotCached(D1_REGISTRY_KEY, msg);
      return bail(D1_ERR_MODEL_MISSING);
    }
  } else if (!options.client && !options.isModelCached) {
    try {
      await assertD1ModelsCached();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'LiquidAI D1 model is not downloaded';
      markNotCached(D1_REGISTRY_KEY, msg);
      return bail(D1_ERR_MODEL_MISSING);
    }
  }

  // Abort any previous in-flight D1 scan so only one scan runs at a time.
  if (activeController) {
    activeController.abort();
  }
  if (activeRunPromise) {
    await activeRunPromise.catch(() => {});
  }
  if (getStatus() !== 'idle') return bail(D1_ERR_CAPTURE_ACTIVE);
  if (semanticIndexDepth > 0 || options.isIndexingActive?.()) return bail(D1_ERR_INDEXING_BUSY);

  clearIdleDisposeTimer();

  const client = options.client ?? d1Client;
  const idleDisposeMs = options.idleDisposeMs ?? D1_IDLE_DISPOSE_MS;
  const controller = new AbortController();
  const { signal } = controller;
  activeController = controller;
  activeClient = client;
  activeSessionId = sessionId;

  const startEpoch = cancelEpoch;
  console.info('[D1] run: start', { sessionId, segments: finalSegments.length });
  const callTimeoutMs = options.callTimeoutMs ?? D1_CALL_TIMEOUT_MS;
  const bootTimeoutMs = options.bootTimeoutMs ?? D1_BOOT_TIMEOUT_MS;
  let booted = false;
  /** The first call of a run loads the model, so it gets the longer boot timeout. */
  const nextCallTimeout = (): number => {
    const ms = booted ? callTimeoutMs : bootTimeoutMs;
    booted = true;
    return ms;
  };

  let runPromise: Promise<SessionIntelligence | null> | null = null;
  const executeRun = async (): Promise<SessionIntelligence | null> => {
    const hashes = new Map<string, string>();
    for (const seg of finalSegments) {
      hashes.set(seg.id, hashSegmentText(seg.text));
    }

    const existing = await getSessionIntelligence(sessionId);
    if (signal.aborted || getStatus() !== 'idle') return null;

    const allAlreadyAnalyzed =
      !options.force &&
      existing.status === 'done' &&
      finalSegments.every((seg) => Boolean(existing.triageBySegment[triageKey(seg.id, hashes.get(seg.id)!)]));
    if (allAlreadyAnalyzed) {
      return existing;
    }

    const pass1Indices: number[] = [];
    for (let i = 0; i < finalSegments.length; i++) {
      const seg = finalSegments[i];
      if (!seg.lowConfSpans || seg.lowConfSpans.length === 0) continue;
      const key = triageKey(seg.id, hashes.get(seg.id)!);
      if (!options.force && existing.triageBySegment[key]) continue;
      pass1Indices.push(i);
    }

    const windowBatches = buildWindowBatches(finalSegments.length);
    const transitionBatches = buildTransitionBatches(finalSegments);

    const total =
      pass1Indices.length +
      windowBatches.reduce((sum, b) => sum + b.windowCount, 0) +
      transitionBatches.reduce((sum, b) => sum + b.pairCount, 0);

    let done = 0;

    await updateSessionIntelligence(sessionId, (cur) => ({
      ...cur,
      status: 'running',
      progress: { done: 0, total },
      error: null,
      ...(options.force ? { decisions: [], actionItems: [] } : {}),
    }));

    const epoch = startEpoch;
    const checkAbort = (): boolean =>
      signal.aborted || epoch !== cancelEpoch || getStatus() !== 'idle';

    try {
      // Pass 1: Low-confidence span adjudication (batched, with surrounding context).
      for (let offset = 0; offset < pass1Indices.length; offset += D1_MAX_BATCH_SIZE) {
        if (checkAbort()) break;
        const batchIndices = pass1Indices.slice(offset, offset + D1_MAX_BATCH_SIZE);
        const targetSet = new Set(batchIndices);
        const sliceStart = Math.max(0, batchIndices[0] - 1);
        const sliceEnd = Math.min(finalSegments.length - 1, batchIndices[batchIndices.length - 1] + 1);

        const batchInputs: D1SegmentInput[] = [];
        for (let idx = sliceStart; idx <= sliceEnd; idx++) {
          const seg = finalSegments[idx];
          const input = toD1SegmentInput(seg, speakerLabelFor(seg, speakers));
          if (!targetSet.has(idx)) {
            input.lowConfSpans = undefined;
          }
          batchInputs.push(input);
        }

        const triageResults = await withTimeout(
          client.triageLowConfidence(batchInputs, { onlyLowConfSpans: true }),
          signal,
          nextCallTimeout(),
        );
        if (checkAbort()) break;

        done += batchIndices.length;
        const segById = new Map(finalSegments.map((s) => [s.id, s]));
        const now = Date.now();

        await updateSessionIntelligence(sessionId, (cur) => {
          const nextTriage: Record<string, SegmentTriage> = { ...cur.triageBySegment };
          for (const res of triageResults) {
            const seg = segById.get(res.segmentId);
            if (!seg) continue;
            const textHash = hashes.get(seg.id)!;
            const key = triageKey(seg.id, textHash);
            nextTriage[key] = {
              segmentId: seg.id,
              textHash,
              reviewedSpans: res.reviewedSpans
                .filter((sp) => sp.flagged)
                .map((sp) => ({
                  startChar: sp.startChar,
                  endChar: sp.endChar,
                  suggestion: sp.suggestion,
                })),
              suspectSpeaker: cur.triageBySegment[key]?.suspectSpeaker ?? false,
              analyzedAt: now,
            };
          }
          return {
            ...cur,
            status: 'running',
            progress: { done, total },
            triageBySegment: nextTriage,
            error: null,
          };
        });
      }

      // Pass 2: Sliding 3-5 segment windows for decisions & action items.
      for (const batch of windowBatches) {
        if (checkAbort()) break;
        const sliceInputs = finalSegments
          .slice(batch.startSegmentIdx, batch.endSegmentIdx)
          .map((seg) => toD1SegmentInput(seg, speakerLabelFor(seg, speakers)));

        const detected = await withTimeout(
          client.detectDecisionsAndActions(sliceInputs, {
            windowSize: DECISION_WINDOW_SIZE,
            stride: DECISION_WINDOW_STRIDE,
          }),
          signal,
          nextCallTimeout(),
        );
        if (checkAbort()) break;

        done += batch.windowCount;
        const incomingDecisions: MeetingDecisionItem[] = detected.decisions.map((d) => ({
          id: decisionId(d.segmentIds, d.text),
          text: d.text,
          segmentIds: d.segmentIds,
          start: d.start,
          confidence: d.confidence,
        }));
        const incomingActions: MeetingActionItem[] = detected.actionItems.map((a) => ({
          id: actionItemId(a.segmentIds, a.text),
          text: a.text,
          segmentIds: a.segmentIds,
          start: a.start,
          owner: a.owner,
          confidence: a.confidence,
        }));

        await updateSessionIntelligence(sessionId, (cur) => ({
          ...cur,
          status: 'running',
          progress: { done, total },
          decisions: mergeById(cur.decisions, incomingDecisions),
          actionItems: mergeById(cur.actionItems, incomingActions),
          error: null,
        }));
      }

      // Pass 3: Advisory turn coherence check for `suspectSpeaker`.
      for (const batch of transitionBatches) {
        if (checkAbort()) break;
        const slice = finalSegments.slice(batch.startIdx, batch.endIdx + 1);
        const turnInputs: D1SegmentInput[] = slice.map((seg, idx) => {
          let label = speakerLabelFor(seg, speakers);
          // Disambiguate if two distinct speaker IDs happen to share a user label.
          if (idx > 0 && slice[idx - 1].speaker !== seg.speaker && label === speakerLabelFor(slice[idx - 1], speakers)) {
            label = `${label} (${seg.speaker})`;
          }
          return toD1SegmentInput(seg, label);
        });

        const verifications = await withTimeout(
          client.verifySpeakerTurns(turnInputs, { checkAllAdjacent: false }),
          signal,
          nextCallTimeout(),
        );
        if (checkAbort()) break;

        done += batch.pairCount;
        const now = Date.now();
        const segById = new Map(slice.map((s) => [s.id, s]));

        await updateSessionIntelligence(sessionId, (cur) => {
          const nextTriage: Record<string, SegmentTriage> = { ...cur.triageBySegment };
          for (const res of verifications) {
            const seg = segById.get(res.segmentId);
            if (!seg) continue;
            const textHash = hashes.get(seg.id)!;
            const key = triageKey(seg.id, textHash);
            const prevEntry = nextTriage[key];
            nextTriage[key] = {
              segmentId: seg.id,
              textHash,
              reviewedSpans: prevEntry?.reviewedSpans ?? [],
              suspectSpeaker: res.suspectSpeaker,
              analyzedAt: now,
            };
          }
          return {
            ...cur,
            status: 'running',
            progress: { done, total },
            triageBySegment: nextTriage,
            error: null,
          };
        });
      }

      if (checkAbort()) {
        await updateSessionIntelligence(sessionId, (cur) => ({
          ...cur,
          status: 'idle',
          error: null,
        }));
        return null;
      }

      const now = Date.now();
      const finalRecord = await updateSessionIntelligence(sessionId, (cur) => {
        const nextTriage: Record<string, SegmentTriage> = { ...cur.triageBySegment };
        for (const seg of finalSegments) {
          const textHash = hashes.get(seg.id)!;
          const key = triageKey(seg.id, textHash);
          if (!nextTriage[key]) {
            nextTriage[key] = {
              segmentId: seg.id,
              textHash,
              reviewedSpans: [],
              suspectSpeaker: false,
              analyzedAt: now,
            };
          }
        }
        return {
          ...cur,
          status: 'done',
          progress: { done: total, total },
          triageBySegment: nextTriage,
          error: null,
        };
      });

      scheduleIdleDispose(client, idleDisposeMs);
      return finalRecord;
    } catch (err) {
      if (isAbortError(err, signal) || getStatus() !== 'idle') {
        await updateSessionIntelligence(sessionId, (cur) => ({
          ...cur,
          status: 'idle',
          error: null,
        }));
        return null;
      }

      const message = err instanceof Error ? err.message : 'LiquidAI D1 analysis failed';
      if (/not downloaded|not-cached/i.test(message)) {
        markNotCached(D1_REGISTRY_KEY, message);
      }
      if (message === D1_ERR_TIMEOUT) {
        // The worker is hung: kill it now instead of waiting for idle dispose.
        await client.dispose().catch(() => {});
      }
      await updateSessionIntelligence(sessionId, (cur) => ({
        ...cur,
        status: 'error',
        error: message,
      }));
      scheduleIdleDispose(client, idleDisposeMs);
      return null;
    } finally {
      if (activeController === controller) {
        activeController = null;
        activeSessionId = null;
      }
      if (runPromise && activeRunPromise === runPromise) {
        activeRunPromise = null;
      }
    }
  };

  runPromise = executeRun();
  activeRunPromise = runPromise;
  return runPromise;
}
