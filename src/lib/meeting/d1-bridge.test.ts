// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Client, D1SegmentInput, D1TriageResult } from '@/lib/d1';
import {
  __resetIntelligenceStoreForTests,
  getSessionIntelligence,
  hashSegmentText,
  triageKey,
  updateSessionIntelligence,
} from '@/lib/d1/store';
import type { Segment, Speaker } from './types';

function seg(
  id: string,
  speaker: string,
  text: string,
  start: number,
  end: number,
  lowConfSpans?: Segment['lowConfSpans'],
): Segment {
  return {
    id,
    source: speaker.startsWith('system') ? 'system' : 'mic',
    speaker,
    text,
    start,
    end,
    final: true,
    ...(lowConfSpans ? { lowConfSpans } : {}),
  };
}

const SPEAKERS: Record<string, Speaker> = {
  'mic:0': { id: 'mic:0', source: 'mic', label: 'You', colorIndex: 0 },
  'system:0': { id: 'system:0', source: 'system', label: 'Alice', colorIndex: 1 },
};

function makeFakeD1Client(overrides: Partial<D1Client> = {}) {
  const calls = {
    triage: [] as Parameters<D1Client['triageLowConfidence']>[0][],
    decisions: [] as Parameters<D1Client['detectDecisionsAndActions']>[0][],
    turns: [] as Parameters<D1Client['verifySpeakerTurns']>[0][],
    disposeCount: 0,
    terminateCount: 0,
  };

  const client: D1Client = {
    decide: vi.fn(async () => []),
    triageLowConfidence: vi.fn(async (segments: readonly D1SegmentInput[]) => {
      calls.triage.push(segments);
      return segments
        .filter((s) => (s.lowConfSpans?.length ?? 0) > 0)
        .map((s) => ({
          segmentId: s.id,
          errorProbability: 0.9,
          coherenceScore: 0.33,
          flagged: true,
          reviewedSpans: (s.lowConfSpans ?? []).map(([startChar, endChar, conf]) => ({
            startChar,
            endChar,
            conf,
            errorProbability: 0.9,
            coherenceScore: 0.33,
            flagged: true,
            suggestion: 'ship',
          })),
        }));
    }),
    detectDecisionsAndActions: vi.fn(async (segments: readonly D1SegmentInput[]) => {
      calls.decisions.push(segments);
      return {
        decisions: [
          {
            text: segments.map((s) => s.text).join(' '),
            segmentIds: segments.map((s) => s.id),
            start: segments[0]?.start ?? 0,
            confidence: 0.85,
          },
        ],
        actionItems: [
          {
            text: `Follow up: ${segments[0]?.text ?? ''}`,
            segmentIds: [segments[0]?.id ?? 's0'],
            start: segments[0]?.start ?? 0,
            owner: segments[0]?.speaker ?? null,
            confidence: 0.8,
          },
        ],
        windows: [],
      };
    }),
    verifySpeakerTurns: vi.fn(async (segments: readonly D1SegmentInput[]) => {
      calls.turns.push(segments);
      const out = [];
      for (let i = 1; i < segments.length; i++) {
        if (segments[i - 1].speaker === segments[i].speaker) continue;
        out.push({
          segmentId: segments[i].id,
          prevSegmentId: segments[i - 1].id,
          sameSpeakerProbability: 0.82,
          suspectSpeaker: true,
        });
      }
      return out;
    }),
    dispose: vi.fn(async () => {
      calls.disposeCount += 1;
    }),
    terminate: vi.fn(() => {
      calls.terminateCount += 1;
    }),
    ...overrides,
  };

  return { client, calls };
}

function deleteIntelligenceDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('mn-intelligence-db');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe('d1-bridge', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    localStorage.clear();
    __resetIntelligenceStoreForTests();
    await deleteIntelligenceDb();
    vi.resetModules();
  });

  afterEach(async () => {
    vi.useRealTimers();
    // `vi.doMock` registrations outlive `resetModules()`; drop them so later
    // tests import the real bridge instead of the lifecycle test's stubs.
    vi.doUnmock('./d1-bridge');
    vi.doUnmock('./browser-asr');
    vi.doUnmock('@/lib/semantic-search/service');
    const bridge = await import('./d1-bridge');
    await bridge.releaseD1ForCapture();
    const storeMod = await import('@/lib/d1/store');
    storeMod.__resetIntelligenceStoreForTests();
    __resetIntelligenceStoreForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('registers d1-omni-600m with kind "decisions", preCheckCache, and non-blocking readiness', async () => {
    const registry = await import('@/lib/asr/browser/model-registry');
    const readiness = await import('@/components/meeting/modelReadiness');
    const bridge = await import('./d1-bridge');

    registry.initRegistry();
    registry.registerDefaultModels('webgpu');
    bridge.registerD1Model();

    const entry = registry.getModelStatus(bridge.D1_REGISTRY_KEY);
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe('decisions');
    expect(entry?.preCheckCache).toBe(true);
    expect(entry?.status).toBe('not-downloaded');

    // Mark ASR cached while D1 stays not-downloaded (or failed): Record must stay ready.
    const asrEntry = Object.values(registry.getState().entries).find((e) => (e.kind ?? 'asr') === 'asr')!;
    registry.markCached(asrEntry.key);
    registry.markFailed(bridge.D1_REGISTRY_KEY, 'Network error');

    const entries = Object.values(registry.getState().entries);
    expect(readiness.deriveModelReadiness(entries, { enabled: true, phase: 'ready' })).toBe('ready');
  });

  it('wires the "decisions" download handler to ensureD1ModelsCached', async () => {
    const ensureSpy = vi.fn(async (onProgress?: (file: unknown, p: { loaded: number; total: number; file: string; resuming: boolean }) => void) => {
      onProgress?.({ filename: 'config.json' }, { loaded: 100, total: 100, file: 'config.json', resuming: false });
    });
    vi.doMock('@/lib/d1', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/d1')>();
      return {
        ...actual,
        ensureD1ModelsCached: ensureSpy,
      };
    });

    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');

    asr.initRegistry();
    bridge.registerD1Model();
    asr.recordConsent('accepted', [bridge.D1_REGISTRY_KEY]);
    await asr.retryDownload(bridge.D1_REGISTRY_KEY);

    expect(ensureSpy).toHaveBeenCalledTimes(1);
    expect(asr.getModelStatus(bridge.D1_REGISTRY_KEY)?.status).toBe('cached');
  });

  it('refuses to run when model is not cached or capture is not idle', async () => {
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');
    const { client, calls } = makeFakeD1Client();

    asr.initRegistry();
    bridge.registerD1Model();
    const segments = [seg('s1', 'mic:0', 'Ship on Friday', 0, 2, [[0, 4, 0.4]])];

    // Not cached yet
    const r1 = await bridge.runD1AnalysisForSession('sess-1', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });
    expect(r1).toBeNull();
    expect(calls.triage).toHaveLength(0);

    // Cached, but capture is live
    asr.markCached(bridge.D1_REGISTRY_KEY);
    const r2 = await bridge.runD1AnalysisForSession('sess-1', segments, SPEAKERS, {
      client,
      getStatus: () => 'live',
    });
    expect(r2).toBeNull();
    expect(calls.triage).toHaveLength(0);

    // Cached, but assertCached discovers IndexedDB eviction
    const r3 = await bridge.runD1AnalysisForSession('sess-1', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
      assertCached: async () => {
        throw new Error('LiquidAI D1 model is not downloaded');
      },
    });
    expect(r3).toBeNull();
    expect(asr.getModelStatus(bridge.D1_REGISTRY_KEY)?.status).toBe('not-downloaded');
  });

  it('runs batched incremental passes, persists to IndexedDB without mutating segments, and schedules 2-minute idle dispose', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');
    const { client, calls } = makeFakeD1Client();

    asr.initRegistry();
    bridge.registerD1Model();
    asr.markCached(bridge.D1_REGISTRY_KEY);

    const segments = [
      seg('s1', 'mic:0', 'Let us sip the release on Friday', 0, 3, [[7, 10, 0.35]]),
      seg('s2', 'system:0', 'Agreed, I will update the changelog today', 3, 6),
      seg('s3', 'system:0', 'Wait, let me also check the migrations', 6, 9),
      seg('s4', 'mic:0', 'Sounds good', 9, 11),
      seg('s5', 'mic:0', 'We are aligned on the launch plan', 11, 14),
    ];
    const snapshotBefore = JSON.stringify(segments);

    const result = await bridge.runD1AnalysisForSession('sess-2', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe('done');
    expect(result?.progress.done).toBe(result?.progress.total);
    // Pass 1 ran on s1 (with lowConfSpans)
    expect(calls.triage.length).toBe(1);
    const s1Key = triageKey('s1', hashSegmentText(segments[0].text));
    expect(result?.triageBySegment[s1Key]?.reviewedSpans).toEqual([
      { startChar: 7, endChar: 10, suggestion: 'ship' },
    ]);
    // Pass 2 extracted decisions and action items (1 batch covering 2 sliding windows)
    expect(calls.decisions.length).toBe(1);
    expect(calls.decisions[0]).toHaveLength(5);
    expect(result?.progress.total).toBe(5); // 1 triage + 2 windows + 2 speaker transitions
    expect(result?.decisions.length).toBeGreaterThan(0);
    expect(result?.actionItems.length).toBeGreaterThan(0);
    expect(result?.actionItems[0]?.owner).toBe('You');
    // Pass 3 flagged advisory suspectSpeaker on transitions without mutating original segments
    expect(calls.turns.length).toBe(1);
    const s2Key = triageKey('s2', hashSegmentText(segments[1].text));
    expect(result?.triageBySegment[s2Key]?.suspectSpeaker).toBe(true);
    expect(JSON.stringify(segments)).toBe(snapshotBefore);

    // Persisted in IndexedDB across in-memory reset
    __resetIntelligenceStoreForTests();
    const reloaded = await getSessionIntelligence('sess-2');
    expect(reloaded.status).toBe('done');
    expect(reloaded.triageBySegment[s1Key]?.reviewedSpans).toHaveLength(1);
    expect(reloaded.triageBySegment[s2Key]?.suspectSpeaker).toBe(true);

    // Idle disposal timer: not disposed before 2 min, disposed at 2 min
    expect(calls.disposeCount).toBe(0);
    await vi.advanceTimersByTimeAsync(bridge.D1_IDLE_DISPOSE_MS - 1);
    expect(calls.disposeCount).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.disposeCount).toBe(1);
  });

  it('skips already-analyzed segments on reload and re-analyzes edited segments', async () => {
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');
    const { client, calls } = makeFakeD1Client();

    asr.initRegistry();
    bridge.registerD1Model();
    asr.markCached(bridge.D1_REGISTRY_KEY);

    const segments = [
      seg('s1', 'mic:0', 'First version with typo', 0, 2, [[19, 23, 0.4]]),
      seg('s2', 'system:0', 'We agree on the plan', 2, 4),
    ];

    await bridge.runD1AnalysisForSession('sess-resume', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });
    expect(calls.triage).toHaveLength(1);

    // Second run with identical text skips completely without touching client
    await bridge.runD1AnalysisForSession('sess-resume', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });
    expect(calls.triage).toHaveLength(1);
    expect(calls.decisions).toHaveLength(1);

    // Edit s1's text -> hash changes -> D1 runs again for the changed segment
    const edited = [
      seg('s1', 'mic:0', 'First version corrected', 0, 2, [[14, 23, 0.5]]),
      segments[1],
    ];
    await bridge.runD1AnalysisForSession('sess-resume', edited, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });
    expect(calls.triage).toHaveLength(2);
  });

  it('serializes D1 with indexMeeting() so EmbeddingGemma 2 and D1 never run concurrently', async () => {
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');
    const events: string[] = [];

    asr.initRegistry();
    bridge.registerD1Model();
    asr.markCached(bridge.D1_REGISTRY_KEY);

    let releaseIndex!: () => void;
    const indexGate = new Promise<void>((resolve) => {
      releaseIndex = resolve;
    });

    const { client } = makeFakeD1Client({
      detectDecisionsAndActions: vi.fn(async (segs: readonly D1SegmentInput[]) => {
        events.push('d1-start');
        events.push('d1-end');
        return { decisions: [], actionItems: [], windows: [{ segmentIds: segs.map((s) => s.id), start: 0, label: 'discussion' as const, confidence: 1, probabilities: {} }] };
      }),
    });

    const indexPromise = bridge.runSemanticIndexingSerialized(async () => {
      events.push('index-start');
      await indexGate;
      events.push('index-end');
      return [];
    });

    const d1Promise = bridge.runD1AnalysisForSession(
      'sess-serial',
      [seg('s1', 'mic:0', 'Hello world', 0, 1)],
      SPEAKERS,
      { client, getStatus: () => 'idle' },
    );

    // Yield microtasks: D1 must NOT start while indexMeeting is active
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(['index-start']);

    releaseIndex();
    await Promise.all([indexPromise, d1Promise]);
    expect(events).toEqual(['index-start', 'index-end', 'd1-start', 'd1-end']);
  });

  it('aborts active scan and disposes worker immediately on releaseD1ForCapture()', async () => {
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');

    asr.initRegistry();
    bridge.registerD1Model();
    asr.markCached(bridge.D1_REGISTRY_KEY);

    let rejectInFlight!: (err: Error) => void;
    let enteredWorker = false;
    let markEntered!: () => void;
    const enteredPromise = new Promise<void>((r) => {
      markEntered = r;
    });

    const { client, calls } = makeFakeD1Client({
      triageLowConfidence: vi.fn(
        () =>
          new Promise<D1TriageResult[]>((_, reject) => {
            enteredWorker = true;
            rejectInFlight = reject;
            markEntered();
          }),
      ),
      dispose: vi.fn(async () => {
        calls.disposeCount += 1;
        rejectInFlight?.(new Error('D1 client disposed'));
      }),
    });

    const segments = [
      seg('s1', 'mic:0', 'Unclear word here', 0, 2, [[8, 12, 0.3]]),
      seg('s2', 'system:0', 'Another segment', 2, 4),
    ];

    const runPromise = bridge.runD1AnalysisForSession('sess-abort', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });

    await enteredPromise;
    expect(enteredWorker).toBe(true);

    await bridge.releaseD1ForCapture();
    const res = await runPromise;

    expect(res).toBeNull();
    expect(calls.disposeCount).toBeGreaterThanOrEqual(1);
    const stored = await getSessionIntelligence('sess-abort');
    expect(stored.status).toBe('idle');
    expect(stored.error).toBeNull();
  });

  it('wires meeting.start() to await releaseD1ForCapture() before ensureBrowserASRReady(), triggers D1 after stop, and releases on meeting.release()', async () => {
    const order: string[] = [];
    let releaseCaptureGate!: () => void;
    const d1DisposeGate = new Promise<void>((resolve) => {
      releaseCaptureGate = resolve;
    });

    const fakeTrack = { kind: 'audio', stop: vi.fn(), onended: null };
    const fakeStream = {
      getTracks: () => [fakeTrack],
      getAudioTracks: () => [fakeTrack],
      getVideoTracks: () => [],
      removeTrack: vi.fn(),
    } as unknown as MediaStream;

    const getUserMediaMock = vi.fn().mockResolvedValue(fakeStream);
    const getDisplayMediaMock = vi.fn().mockResolvedValue(fakeStream);

    vi.stubGlobal('WebSocket', undefined);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: getUserMediaMock,
        getDisplayMedia: getDisplayMediaMock,
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        sampleRate = 16000;
        audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
        resume = vi.fn().mockResolvedValue(undefined);
        close = vi.fn().mockResolvedValue(undefined);
        createMediaStreamSource() {
          return { connect: vi.fn(), disconnect: vi.fn() };
        }
      },
    );
    vi.stubGlobal(
      'AudioWorkletNode',
      class {
        port = { onmessage: null, close: vi.fn() };
        disconnect = vi.fn();
      },
    );

    const releaseSpy = vi.fn(async () => {
      order.push('releaseD1-start');
      await d1DisposeGate;
      order.push('releaseD1-done');
    });
    const runD1Spy = vi.fn(async () => {
      order.push('runD1');
      return null;
    });
    const indexSpy = vi.fn(async () => {
      order.push('indexMeeting');
      return null;
    });
    const ensureAsrSpy = vi.fn(async () => {
      order.push('ensureBrowserASRReady');
      return true;
    });

    vi.doMock('@/lib/semantic-search/service', () => ({
      indexMeeting: indexSpy,
      disposeSharedEmbedder: vi.fn(),
    }));
    vi.doMock('./browser-asr', async (importOriginal) => {
      const actual = await importOriginal<typeof import('./browser-asr')>();
      return {
        ...actual,
        resolveAsrBackend: vi.fn(async () => 'webgpu'),
        isPostStopTranscriptionOnly: vi.fn(() => false),
        ensureBrowserASRReady: ensureAsrSpy,
        flushLiveAudio: vi.fn(async () => {}),
        resetBrowserASR: vi.fn(),
        beginRecordedAudioCapture: vi.fn(),
      };
    });
    vi.doMock('./d1-bridge', async (importOriginal) => {
      const actual = await importOriginal<typeof import('./d1-bridge')>();
      return {
        ...actual,
        releaseD1ForCapture: releaseSpy,
        isD1ModelCachedAndConsented: () => true,
        runD1AnalysisForSession: runD1Spy,
      };
    });

    const store = await import('./store');
    const { meeting } = await import('./index');

    store.bindTranscriptSession('sess-lifecycle');

    const startPromise = meeting.start({ mode: 'both' });
    // getDisplayMedia must still be called synchronously before any await
    expect(getDisplayMediaMock).toHaveBeenCalledTimes(1);
    expect(releaseSpy).toHaveBeenCalledTimes(1);
    // ensureBrowserASRReady must NOT run until releaseD1ForCapture settles
    await Promise.resolve();
    expect(ensureAsrSpy).not.toHaveBeenCalled();

    releaseCaptureGate();
    await startPromise;
    await vi.waitFor(() => expect(ensureAsrSpy).toHaveBeenCalledTimes(1));
    expect(order.indexOf('releaseD1-done')).toBeLessThan(order.indexOf('ensureBrowserASRReady'));

    // Add a final segment, then stop -> triggers indexMeeting then runD1AnalysisForSession
    store.upsertSegment(seg('s1', 'mic:0', 'Decision made to ship tomorrow', 0, 2));
    await meeting.stop();

    await vi.waitFor(() => {
      expect(indexSpy).toHaveBeenCalledWith('sess-lifecycle');
      expect(runD1Spy).toHaveBeenCalledTimes(1);
    });
    expect(order.indexOf('indexMeeting')).toBeLessThan(order.indexOf('runD1'));

    // meeting.release() also triggers releaseD1ForCapture()
    const callsBeforeRelease = releaseSpy.mock.calls.length;
    await meeting.release();
    expect(releaseSpy.mock.calls.length).toBeGreaterThan(callsBeforeRelease);
  });

  it('cancelD1Analysis() aborts a hung D1 call, terminates the worker, and resets the status to idle', async () => {
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');
    const storeMod = await import('@/lib/d1/store');

    asr.initRegistry();
    bridge.registerD1Model();
    asr.markCached(bridge.D1_REGISTRY_KEY);

    let markEntered!: () => void;
    const enteredPromise = new Promise<void>((r) => {
      markEntered = r;
    });
    const { client, calls } = makeFakeD1Client({
      triageLowConfidence: vi.fn(() => {
        markEntered();
        return new Promise<D1TriageResult[]>(() => {});
      }),
    });

    const segments = [seg('s1', 'mic:0', 'Unclear word here', 0, 2, [[8, 12, 0.3]])];
    const runPromise = bridge.runD1AnalysisForSession('sess-cancel', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
    });

    await enteredPromise;
    await bridge.cancelD1Analysis('sess-cancel');

    // The UI view is reset synchronously and the worker is hard-killed.
    expect(storeMod.getIntelligenceSnapshot('sess-cancel').status).toBe('idle');
    expect(calls.terminateCount).toBeGreaterThanOrEqual(1);
    expect(await runPromise).toBeNull();
    await vi.waitFor(async () => {
      const stored = await storeMod.getSessionIntelligence('sess-cancel');
      expect(stored.status).toBe('idle');
      expect(stored.error).toBeNull();
    });
  });

  it('turns a hung D1 call into status "error" with D1_ERR_TIMEOUT and disposes the worker', async () => {
    const asr = await import('@/lib/asr/browser');
    const bridge = await import('./d1-bridge');

    asr.initRegistry();
    bridge.registerD1Model();
    asr.markCached(bridge.D1_REGISTRY_KEY);

    const { client, calls } = makeFakeD1Client({
      triageLowConfidence: vi.fn(() => new Promise<D1TriageResult[]>(() => {})),
    });

    const segments = [seg('s1', 'mic:0', 'Unclear word here', 0, 2, [[8, 12, 0.3]])];
    const res = await bridge.runD1AnalysisForSession('sess-timeout', segments, SPEAKERS, {
      client,
      getStatus: () => 'idle',
      callTimeoutMs: 20,
      bootTimeoutMs: 20,
    });

    expect(res).toBeNull();
    expect(bridge.D1_ERR_TIMEOUT).toBe('d1:timeout');
    const stored = await getSessionIntelligence('sess-timeout');
    expect(stored.status).toBe('error');
    expect(stored.error).toBe(bridge.D1_ERR_TIMEOUT);
    expect(calls.disposeCount).toBeGreaterThanOrEqual(1);
  });

  it('recoverStaleD1Run() resets a stored "running" record left behind by a killed scan to idle', async () => {
    const bridge = await import('./d1-bridge');

    await updateSessionIntelligence('sess-stale', (cur) => ({
      ...cur,
      status: 'running',
      progress: { done: 3, total: 178 },
    }));

    await bridge.recoverStaleD1Run('sess-stale');

    const stored = await getSessionIntelligence('sess-stale');
    expect(stored.status).toBe('idle');
    expect(stored.progress).toEqual({ done: 0, total: 0 });
  });
});
