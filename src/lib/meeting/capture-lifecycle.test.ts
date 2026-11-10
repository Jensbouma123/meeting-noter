import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Every MediaStreamTrack a session acquires must be stopped, and its
 * AudioContext closed, on every way a session can end — or the browser's
 * microphone indicator stays on after the recording is over. The fake
 * `mediaDevices` below records every track it hands out, so each path can
 * assert on all of them rather than on the ones the code happened to keep.
 */

interface FakeTrack {
  kind: 'audio' | 'video';
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  getConstraints: () => MediaTrackConstraints;
  applyConstraints: ReturnType<typeof vi.fn>;
}

let tracks: FakeTrack[];
let contexts: FakeAudioContext[];

function fakeTrack(kind: 'audio' | 'video'): FakeTrack {
  const track: FakeTrack = {
    kind,
    stop: vi.fn(),
    onended: null,
    getConstraints: () => ({ echoCancellation: true, noiseSuppression: true }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
  tracks.push(track);
  return track;
}

function fakeStream(opts: { audio?: boolean; video?: boolean } = {}): MediaStream {
  const list: FakeTrack[] = [];
  if (opts.audio !== false) list.push(fakeTrack('audio'));
  if (opts.video) list.push(fakeTrack('video'));
  return {
    getTracks: () => [...list],
    getAudioTracks: () => list.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => list.filter((t) => t.kind === 'video'),
    removeTrack: (t: unknown) => {
      const i = list.indexOf(t as FakeTrack);
      if (i >= 0) list.splice(i, 1);
    },
  } as unknown as MediaStream;
}

class FakeAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  sampleRate = 48000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  constructor() {
    contexts.push(this);
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

class FakeAudioWorkletNode {
  static instances: FakeAudioWorkletNode[] = [];
  port: { onmessage: ((ev: MessageEvent) => void) | null; close: () => void } = {
    onmessage: null,
    close: vi.fn(),
  };
  disconnect = vi.fn();
  constructor() {
    FakeAudioWorkletNode.instances.push(this);
  }
}

/** A promise with its resolve/reject handed out, for a request still "on screen". */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let getUserMedia: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;
let win: EventTarget & { AudioContext?: typeof FakeAudioContext };

const CHROME = {
  vendor: 'Google Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};
const SAFARI = {
  vendor: 'Apple Computer, Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
};

function install(browser: typeof CHROME = CHROME): void {
  getUserMedia = vi.fn(async () => fakeStream({ audio: true }));
  getDisplayMedia = vi.fn(async () => fakeStream({ audio: true, video: true }));
  vi.stubGlobal('navigator', {
    ...browser,
    mediaDevices: { getUserMedia, getDisplayMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
  });
  win = Object.assign(new EventTarget(), { AudioContext: FakeAudioContext });
  vi.stubGlobal('window', win);
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
}

function expectAllReleased(): void {
  expect(tracks.length).toBeGreaterThan(0);
  for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  for (const c of contexts) expect(c.close).toHaveBeenCalled();
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  tracks = [];
  contexts = [];
  FakeAudioWorkletNode.instances.length = 0;
  install();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Capture: every acquired track is stopped', () => {
  const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn() };

  it('on dispose after a mic-only start', async () => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('mic');
    await cap.dispose();
    expectAllReleased();
  });

  it('on dispose after a "both" start, the share\'s video track included', async () => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic', 'system']);
    await cap.dispose();
    expectAllReleased();
  });

  it('when a dispose lands while the permission prompt is still open', async () => {
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(pending.promise);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    const started = cap.start('mic');
    await cap.dispose();
    pending.resolve(fakeStream());
    await started;
    expect(cap.activeSources).toEqual([]);
    expectAllReleased();
  });

  it('when a dispose lands while the share picker is still open in "both" mode', async () => {
    const share = deferred<MediaStream>();
    getDisplayMedia.mockReturnValueOnce(share.promise);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    const started = cap.start('both');
    await flush();
    await cap.dispose();
    share.resolve(fakeStream({ audio: true, video: true }));
    await started;
    expect(cap.activeSources).toEqual([]);
    expectAllReleased();
  });

  it('when a dispose lands while the worklet module is loading', async () => {
    const load = deferred<void>();
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    const started = cap.start('both');
    contexts[0].audioWorklet.addModule.mockReturnValueOnce(load.promise);
    await flush();
    await cap.dispose();
    load.resolve();
    await started;
    expect(cap.activeSources).toEqual([]);
    expectAllReleased();
  });

  it('when the mic is denied but the share was granted', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/microphone/i);
    expectAllReleased();
  });

  it('when the share is denied in "both" mode (the mic keeps recording until dispose)', async () => {
    getDisplayMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic']);
    await cap.dispose();
    expectAllReleased();
  });

  it('when the shared surface has no audio track', async () => {
    getDisplayMedia.mockResolvedValueOnce(fakeStream({ audio: false, video: true }));
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('system')).rejects.toThrow(/no system audio/i);
    expectAllReleased();
  });

  it('when the worklet fails to load', async () => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    const started = cap.start('both');
    contexts[0].audioWorklet.addModule.mockRejectedValueOnce(new Error('404'));
    await expect(started).rejects.toThrow(/worklet/i);
    expectAllReleased();
  });

  it('when there is no Web Audio at all — nothing is requested', async () => {
    win.AudioContext = undefined;
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/web audio/i);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });

  it('when a dispose lands while the share picker is open, the mic is never requested', async () => {
    const share = deferred<MediaStream>();
    getDisplayMedia.mockReturnValueOnce(share.promise);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    const started = cap.start('both');
    await cap.dispose();
    share.resolve(fakeStream({ audio: true, video: true }));
    await started;
    expect(getUserMedia).not.toHaveBeenCalled();
    expectAllReleased();
  });

  it('on Safari, does not open the mic if the native helper is unavailable', async () => {
    install(SAFARI);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper/);
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('when the user stops sharing mid-session (dropSource)', async () => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('both');
    // The share is requested first (see `Capture.start`), so its tracks come first.
    const shareTrack = tracks[0];
    expect(shareTrack.kind).toBe('audio');
    cap.dropSource('system');
    expect(shareTrack.stop).toHaveBeenCalled();
    expect(cap.activeSources).toEqual(['mic']);
    await cap.dispose();
    expectAllReleased();
  });

  it('stops the tracks synchronously, before dispose() is awaited', async () => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('both');
    void cap.dispose();
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });
});

describe('call audio reaches the transcript', () => {
  const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn() };

  it.each(['both', 'system'] as const)('Chrome/Edge still ask getDisplayMedia for audio in "%s" mode', async (mode) => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start(mode);
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(getDisplayMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: true }));
    expect(cap.activeSources).toContain('system');
    await cap.dispose();
  });

  it('Safari never asks getUserMedia because WebKit can disrupt another call', async () => {
    install(SAFARI);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper/);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    await cap.dispose();
  });
});

describe('meeting: every acquired track is stopped', () => {
  it('requests nothing before Record: importing the module never touches the mic', async () => {
    await import('./index');
    await import('./browser-asr');
    await flush();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });

  it('on start then stop', async () => {
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    await meeting.stop();
    expectAllReleased();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('on stop, before the last-window flush is awaited', async () => {
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    const stopped = meeting.stop();
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
    await stopped;
  });

  it('on pause, resume, then stop', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'mic' });
    meeting.pause();
    expect(getState().status).toBe('paused');
    meeting.resume();
    meeting.pause();
    await meeting.stop();
    expectAllReleased();
  });

  it('on a stop pressed while the permission prompt is open (aborted start)', async () => {
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(pending.promise);
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    const started = meeting.start({ mode: 'mic' });
    expect(getState().status).toBe('requesting');
    await meeting.stop();
    pending.resolve(fakeStream());
    await started;
    expectAllReleased();
    expect(getState().status).toBe('idle');
    expect(getState().error).toBeNull();
  });

  it('on an aborted start, without touching the session started after it', async () => {
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(pending.promise);
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    const first = meeting.start({ mode: 'mic' });
    await meeting.stop();
    await meeting.start({ mode: 'mic' });
    const current = tracks[0];
    pending.resolve(fakeStream());
    await first;
    expect(current.stop).not.toHaveBeenCalled();
    expect(getState().status).toBe('live');
    await meeting.stop();
    expectAllReleased();
  });

  it('on a denied mic', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'both' });
    expect(getState().status).toBe('error');
    expectAllReleased();
  });

  it('on a denied share in "both" mode', async () => {
    getDisplayMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    await meeting.stop();
    expectAllReleased();
  });

  it('on Safari', async () => {
    install(SAFARI);
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    await meeting.stop();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(contexts.every((ctx) => ctx.close.mock.calls.length > 0)).toBe(true);
  });

  it('when the last source ends by itself', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'mic' });
    tracks[0].onended?.();
    await flush();
    expect(getState().status).toBe('idle');
    expectAllReleased();
  });

  it('on pagehide, synchronously', async () => {
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    win.dispatchEvent(new Event('pagehide'));
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
    await flush();
    expectAllReleased();
  });

  it('on pagehide while the permission prompt is still open', async () => {
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(pending.promise);
    const { meeting } = await import('./index');
    const started = meeting.start({ mode: 'mic' });
    win.dispatchEvent(new Event('pagehide'));
    pending.resolve(fakeStream());
    await started;
    await flush();
    expectAllReleased();
  });

  it('on release() (the meeting view unmounting)', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'mic' });
    await meeting.release();
    expectAllReleased();
    expect(getState().status).toBe('idle');
  });
});

describe('levels reach the meters', () => {
  it('publishes speech-level RMS from each worklet as a visible meter level', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
    const { meeting } = await import('./index');
    const seen: { mic: number; system: number }[] = [];
    const unsubscribe = meeting.subscribeLevels((l) => seen.push({ ...l }));
    await meeting.start({ mode: 'both' });
    expect(FakeAudioWorkletNode.instances).toHaveLength(2);
    // Typical meeting speech: RMS ~0.01 (−40 dBFS), which a linear meter
    // drew as its idle floor.
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
    const { meterLevel } = await import('./store');
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
    // A cached, consented model whose load never settles: the page is
    // reloaded mid-load, with its own marker in storage.
    vi.doMock('@/lib/asr/browser', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/asr/browser')>()),
      getModelStatus: () => ({ status: 'cached', modelRepo: 'test/repo' }),
      areModelFilesCached: async () => ({ complete: true, cached: 1, total: 1 }),
      createBrowserASREngine: () => ({ isReady: false, ensureLoaded: () => new Promise<void>(() => {}) }),
    }));
    const { ensureBrowserASRReady } = await import('./browser-asr');
    void ensureBrowserASRReady();
    await vi.waitFor(() => expect(store.has(MARKER)).toBe(true));

    win.dispatchEvent(new Event('pagehide'));
    expect(store.has(MARKER)).toBe(false);
  });

  it('keeps a marker the page booted with: that is the previous page crashing', async () => {
    const store = stubSessionStorage();
    store.set(MARKER, String(Date.now()));
    const { didPreviousModelLoadCrash } = await import('./browser-asr');
    expect(didPreviousModelLoadCrash()).toBe(true);

    win.dispatchEvent(new Event('pagehide'));
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
    const { getState } = await import('./store');
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
    const { getState } = await import('./store');
    await meeting.start({ mode: 'both' });
    // The share is requested first (see `Capture.start`), so the mic's track is the last audio one.
    const audio = tracks.filter((t) => t.kind === 'audio');
    audio[audio.length - 1].onended?.();
    await flush();

    expect(getState().status).toBe('live');
    expect(getState().warning).toMatch(/microphone track ended/i);
    expect(getState().error).toBeNull();
    await meeting.stop();
  });
});
