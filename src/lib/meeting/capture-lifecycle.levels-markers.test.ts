import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  env,
  expectAllReleased,
  FakeAudioWorkletNode,
  flush,
  tracks,
  registerLifecycleEnv,
} from './capture-lifecycle.testUtils';

registerLifecycleEnv();

describe('levels reach the meters', () => {
  it('publishes speech-level RMS from each worklet as a visible meter level', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
    const { meeting } = await import('./index');
    const seen: { mic: number; system: number }[] = [];
    const unsubscribe = meeting.subscribeLevels((l) => seen.push({ ...l }));
    await meeting.start({ mode: 'both' });
    expect(FakeAudioWorkletNode.instances).toHaveLength(2);
    for (const node of FakeAudioWorkletNode.instances) {
      node.port.onmessage?.({ data: { type: 'frame', rms: 0.01, pcm: new ArrayBuffer(3200) } } as MessageEvent);
    }
    await flush();
    const last = seen[seen.length - 1];
    expect(last.mic).toBeGreaterThan(0.3);
    expect(last.system).toBeGreaterThan(0.3);
    unsubscribe();
    await meeting.stop();
  });

  it('maps RMS to a dBFS meter level', async () => {
    const { meterLevel } = await import('./levels-bus');
    expect(meterLevel(0)).toBe(0);
    expect(meterLevel(0.001)).toBeCloseTo(0, 5);
    expect(meterLevel(0.01)).toBeCloseTo(1 / 3, 5);
    expect(meterLevel(0.1)).toBeCloseTo(2 / 3, 5);
    expect(meterLevel(1)).toBe(1);
    expect(meterLevel(2)).toBe(1);
  });
});

describe('crash-loop guard marker', () => {
  const MARKER = 'mn.asr-load-in-progress.v1';

  function stubSessionStorage(): Map<string, string> {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    return store;
  }

  afterEach(() => {
    vi.doUnmock('@/lib/asr/browser');
  });

  it("clears this page's own marker on pagehide: a page that gets to run it did not crash", async () => {
    const store = stubSessionStorage();
    vi.doMock('@/lib/asr/browser', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/asr/browser')>()),
      getModelStatus: () => ({ status: 'cached', modelRepo: 'test/repo' }),
      areModelFilesCached: async () => ({ complete: true, cached: 1, total: 1 }),
      createBrowserASREngine: () => ({ isReady: false, ensureLoaded: () => new Promise<void>(() => {}) }),
    }));
    const { ensureBrowserASRReady } = await import('./browser-asr');
    void ensureBrowserASRReady();
    await vi.waitFor(() => expect(store.has(MARKER)).toBe(true));

    env.win.dispatchEvent(new Event('pagehide'));
    expect(store.has(MARKER)).toBe(false);
  });

  it('keeps a marker the page booted with: that is the previous page crashing', async () => {
    const store = stubSessionStorage();
    store.set(MARKER, String(Date.now()));
    const { didPreviousModelLoadCrash } = await import('./browser-asr');
    expect(didPreviousModelLoadCrash()).toBe(true);

    env.win.dispatchEvent(new Event('pagehide'));
    expect(store.has(MARKER)).toBe(true);
  });
});

describe('meeting: a capture track ending mid-session', () => {
  afterEach(() => {
    vi.doUnmock('./browser-asr');
  });

  it('runs the post-stop transcription when the last source ends on a CPU device', async () => {
    const transcribeRecordedAudioAfterStop = vi.fn(async () => true);
    vi.doMock('./browser-asr', async (importOriginal) => ({
      ...(await importOriginal<typeof import('./browser-asr')>()),
      transcribeRecordedAudioAfterStop,
    }));
    const { meeting, isPostStopTranscriptionOnly } = await import('./index');
    const { getState } = await import('./store-core');
    await meeting.start({ mode: 'system' });
    expect(isPostStopTranscriptionOnly()).toBe(true);

    tracks.find((t) => t.kind === 'audio')?.onended?.();
    await flush();

    expect(transcribeRecordedAudioAfterStop).toHaveBeenCalledTimes(1);
    expect(getState().status).toBe('idle');
    expect(getState().error).toMatch(/session stopped/i);
    expectAllReleased();
  });

  it('keeps recording with a non-blocking warning when the mic ends in "both" mode', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');
    await meeting.start({ mode: 'both' });
    const audio = tracks.filter((t) => t.kind === 'audio');
    audio[audio.length - 1].onended?.();
    await flush();

    expect(getState().status).toBe('live');
    expect(getState().warning).toMatch(/microphone track ended/i);
    expect(getState().error).toBeNull();
    await meeting.stop();
  });
});
