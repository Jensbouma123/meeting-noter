import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `meeting.start()` end-to-end with the browser media APIs stubbed —
 * covering the exact failure modes a "pressing Record does nothing" report
 * can hide behind:
 *
 * - A rejected `getUserMedia`/`getDisplayMedia` must land on `status:
 *   'error'` with a real message, never leave the button in a stuck
 *   'requesting' state.
 * - `getDisplayMedia` must be invoked *synchronously*
 *   within the `start()` call, before any `await` — Safari/Chrome reject a
 *   getDisplayMedia call that isn't still riding the click's transient user
 *   activation, so a regression that adds an `await` before it would pass
 *   every other test here and still break Record in a real browser.
 * - A store `status` stuck on an in-flight value with no actual session
 *   behind it (this module's own `sessionOver`/`capture` bookkeeping) must
 *   not silently block Record forever — see the `looksActive` recovery in
 *   `meeting.start()`. This is the exact shape a dev Fast Refresh can leave
 *   things in when `index.ts` re-evaluates but the separate `store.ts`
 *   module doesn't: a stale "live" status with nothing actually running.
 */

interface FakeTrack {
  kind: 'audio' | 'video';
  stop: () => void;
  onended: (() => void) | null;
}

function fakeTrack(kind: 'audio' | 'video'): FakeTrack {
  return { kind, stop: vi.fn(), onended: null };
}

function fakeStream(opts: { audio?: boolean; video?: boolean } = { audio: true }): MediaStream {
  const tracks: FakeTrack[] = [];
  if (opts.audio !== false) tracks.push(fakeTrack('audio'));
  if (opts.video) tracks.push(fakeTrack('video'));
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    removeTrack: (track: unknown) => {
      const idx = tracks.indexOf(track as FakeTrack);
      if (idx >= 0) tracks.splice(idx, 1);
    },
  } as unknown as MediaStream;
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  sampleRate = 16000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

class FakeAudioWorkletNode {
  /** Every node this test created, so a frame can be injected by hand. */
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

let getUserMediaMock: ReturnType<typeof vi.fn>;
let getDisplayMediaMock: ReturnType<typeof vi.fn>;

function installBrowserStubs(): void {
  getUserMediaMock = vi.fn().mockResolvedValue(fakeStream({ audio: true }));
  getDisplayMediaMock = vi.fn().mockResolvedValue(fakeStream({ audio: true, video: true }));

  // Node 24+ defines a real (getter-only) global `navigator`; a plain
  // assignment throws. `vi.stubGlobal` replaces it properly and
  // `vi.unstubAllGlobals()` restores the original afterward.
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: getUserMediaMock,
      getDisplayMedia: getDisplayMediaMock,
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
  });
  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
}

function uninstallBrowserStubs(): void {
  vi.unstubAllGlobals();
}

describe('meeting.start()', () => {
  beforeEach(() => {
    installBrowserStubs();
    FakeAudioWorkletNode.instances.length = 0;
    vi.resetModules();
  });

  afterEach(() => {
    uninstallBrowserStubs();
  });

  it('goes live on a successful mic-only start', async () => {
    const { meeting, useMeeting: _useMeeting } = await import('./index');
    void _useMeeting;
    const { getState } = await import('./store');

    await meeting.start({ mode: 'mic' });

    expect(getUserMediaMock).toHaveBeenCalled();
    expect(getState().status).toBe('live');
    expect(getState().error).toBeNull();

    await meeting.stop();
  });

  it('surfaces a visible error instead of a silent no-op when the mic is denied', async () => {
    getUserMediaMock.mockRejectedValueOnce(new Error('Permission denied'));
    const { meeting } = await import('./index');
    const { getState } = await import('./store');

    await meeting.start({ mode: 'mic' });

    expect(getState().status).toBe('error');
    expect(getState().error).toMatch(/permission denied/i);

    // And Record must work again right after — an error must not leave the
    // session stuck unable to retry.
    await meeting.start({ mode: 'mic' });
    expect(getState().status).toBe('live');
    await meeting.stop();
  });

  it('calls getDisplayMedia synchronously (before the first await) — required for user-activation', async () => {
    const { meeting } = await import('./index');

    // Deliberately don't await yet: if `start()` put any await before the
    // getDisplayMedia call, this assertion would still see zero calls here.
    // The mic follows once the share settles: getUserMedia needs no user
    // activation, and waiting lets its one request carry the final
    // echo-cancellation setting.
    const startPromise = meeting.start({ mode: 'both' });
    expect(getDisplayMediaMock).toHaveBeenCalled();

    await startPromise;
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    const { getState } = await import('./store');
    expect(getState().status).toBe('live');
    await meeting.stop();
  });

  it('continues mic-only, silently, when call audio is declined in "both" mode', async () => {
    getDisplayMediaMock.mockRejectedValueOnce(new Error('Permission denied'));
    const { meeting, getCallAudioMissing } = await import('./index');
    const { getState } = await import('./store');

    await meeting.start({ mode: 'both' });

    expect(getState().status).toBe('live');
    expect(getState().error).toBeNull();
    expect(getState().warning).toBeNull();
    expect(getCallAudioMissing()).toBe(true);

    await meeting.stop();
  });

  it('requests the mic only once even if start() is invoked twice back-to-back, e.g. a double-click before Record disables', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store');

    // Deliberately not awaited individually: both calls fire in the same
    // synchronous tick, the way two fast click events would, before either
    // has a chance to see the other's state update.
    const first = meeting.start({ mode: 'mic' });
    const second = meeting.start({ mode: 'mic' });
    await Promise.all([first, second]);

    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(getState().status).toBe('live');

    await meeting.stop();
  });

  it('recovers from a stale in-flight status with no real session behind it', async () => {
    const { meeting } = await import('./index');
    const { getState, setState } = await import('./store');

    // Simulate what a dev Fast Refresh (or any other desync) can leave
    // behind: the store still says a session is live, but this module was
    // freshly re-evaluated and has no capture/session of its own running.
    setState({ status: 'live' });

    await meeting.start({ mode: 'mic' });

    expect(getUserMediaMock).toHaveBeenCalled();
    expect(getState().status).toBe('live');

    await meeting.stop();
  });

  it('hands captured audio to the ASR engine instead of dropping it', async () => {
    const { meeting } = await import('./index');
    const { getBrowserASREnabled, getBrowserASRPhase } = await import('./browser-asr');

    await meeting.start({ mode: 'mic' });

    // The engine is the only transcription path, so it must be on with no
    // setup step anywhere in the app (see browser-asr.ts's own default).
    expect(getBrowserASREnabled()).toBe(true);

    // One captured frame, as the worklet would deliver it. The phase moving
    // off 'idle' is the proof that the frame reached the engine and started
    // the model: the old gate (`getBrowserASRReady()`) meant nothing ever
    // started it, so a session recorded audio and produced no transcript and
    // no error at all. (No consent in this test, so the honest end state is
    // 'blocked' — visible — rather than silence.)
    //
    // The stubbed navigator has no WebGPU adapter, so this device is a
    // post-stop one and the frame is *buffered* rather than transcribed live —
    // asserted separately below.
    const node = FakeAudioWorkletNode.instances[0];
    expect(node).toBeDefined();
    node.port.onmessage?.({
      data: { type: 'frame', rms: 0.2, pcm: new Float32Array([0.1, 0.2]).buffer },
    } as unknown as MessageEvent);
    await Promise.resolve();
    expect(getBrowserASRPhase()).not.toBe('idle');

    await meeting.stop();
  });

  /**
   * The frame must reach *something* on every device. A device with no usable
   * WebGPU cannot transcribe live (the CPU model needs 1.41 s of compute per
   * second of audio), so the frame is buffered and the whole recording is
   * transcribed on Stop — and the user is told that while it is still running,
   * because "no live transcript" during a meeting is indistinguishable from a
   * broken app.
   */
  it('buffers the recording and says so on a device without WebGPU', async () => {
    const { meeting } = await import('./index');
    const { getBrowserASRPhase, getBrowserASRStatusMessage } = await import('./browser-asr');
    const { bufferedSeconds } = await import('./post-stop-transcription');

    await meeting.start({ mode: 'mic' });
    expect(getBrowserASRPhase()).toBe('post-stop');
    expect(getBrowserASRStatusMessage()).toMatch(/transcribed after you stop/i);

    const node = FakeAudioWorkletNode.instances[0];
    // 3200 bytes = 1600 Int16 samples = 100 ms at 16 kHz, the worklet's frame.
    for (let i = 0; i < 3; i += 1) {
      node.port.onmessage?.({
        data: { type: 'frame', rms: 0.2, pcm: new Int16Array(1600).buffer },
      } as unknown as MessageEvent);
    }
    await Promise.resolve();

    // 3 x 100 ms buffered: the audio is held, not dropped and not fed to a
    // model that cannot keep up.
    expect(bufferedSeconds().mic).toBeCloseTo(0.3, 5);

    await meeting.stop();
  });
});

/** A promise with its resolve handed out, for work still "in flight". */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function sendFrame(node: FakeAudioWorkletNode): void {
  // 3200 bytes = 1600 Int16 samples = 100 ms at 16 kHz.
  node.port.onmessage?.({
    data: { type: 'frame', rms: 0.2, pcm: new Int16Array(1600).buffer },
  } as unknown as MessageEvent);
}

/**
 * The session lifecycle with the speech engine and diarizer mocked, so a
 * flush, a post-stop run, the backend probe or a model load can be held open
 * and each race played out in order.
 */
describe('meeting session lifecycle races', () => {
  let backend: 'webgpu' | 'wasm' | null;
  let asr: {
    resolveAsrBackend: ReturnType<typeof vi.fn>;
    pushLiveAudio: ReturnType<typeof vi.fn>;
    bufferRecordedAudio: ReturnType<typeof vi.fn>;
    flushLiveAudio: ReturnType<typeof vi.fn>;
    resetBrowserASR: ReturnType<typeof vi.fn>;
    ensureBrowserASRReady: ReturnType<typeof vi.fn>;
    transcribeRecordedAudioAfterStop: ReturnType<typeof vi.fn>;
  };
  let startDiarization: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    installBrowserStubs();
    FakeAudioWorkletNode.instances.length = 0;
    vi.resetModules();
    backend = 'wasm';
    asr = {
      resolveAsrBackend: vi.fn(async () => backend),
      pushLiveAudio: vi.fn(),
      bufferRecordedAudio: vi.fn(),
      flushLiveAudio: vi.fn(async () => {}),
      resetBrowserASR: vi.fn(),
      ensureBrowserASRReady: vi.fn(async () => true),
      transcribeRecordedAudioAfterStop: vi.fn(async () => true),
    };
    startDiarization = vi.fn();
    vi.doMock('./browser-asr', async (importOriginal) => ({
      ...(await importOriginal<typeof import('./browser-asr')>()),
      ...asr,
      getBrowserASREnabled: () => true,
      isPostStopTranscriptionOnly: () => backend === 'wasm',
      isPostStopTranscriptionRunning: () => false,
    }));
    vi.doMock('./diarization-bridge', async (importOriginal) => ({
      ...(await importOriginal<typeof import('./diarization-bridge')>()),
      startDiarization,
    }));
  });

  afterEach(() => {
    vi.doUnmock('./browser-asr');
    vi.doUnmock('./diarization-bridge');
    uninstallBrowserStubs();
  });

  it('joins a second stop() to the one in flight instead of re-running the teardown', async () => {
    const run = deferred<boolean>();
    asr.transcribeRecordedAudioAfterStop.mockReturnValueOnce(run.promise);
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'mic' });

    const first = meeting.stop();
    expect(getState().status).toBe('stopping');
    await tick();
    // A caller awaiting the second stop (release() on unmount) must wait for
    // the real end of the session, not resolve while it is still transcribing.
    let secondSettled = false;
    const second = meeting.stop().then(() => {
      secondSettled = true;
    });
    await tick();

    expect(secondSettled).toBe(false);
    expect(asr.resetBrowserASR).toHaveBeenCalledTimes(1);
    expect(asr.transcribeRecordedAudioAfterStop).toHaveBeenCalledTimes(1);
    expect(getState().status).toBe('stopping');

    run.resolve(true);
    await Promise.all([first, second]);
    expect(getState().status).toBe('idle');
  });

  it('refuses a start() while the previous stop is still flushing, leaving nothing for that stop to tear down', async () => {
    const run = deferred<boolean>();
    asr.transcribeRecordedAudioAfterStop.mockReturnValueOnce(run.promise);
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'mic' });

    const stopped = meeting.stop();
    await meeting.start({ mode: 'mic' });
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(getState().warning).toMatch(/previous recording/i);

    run.resolve(true);
    await stopped;
    expect(getState().status).toBe('idle');

    // Once the stop has finished, Record works again.
    await meeting.start({ mode: 'mic' });
    expect(getState().status).toBe('live');
    await meeting.stop();
  });

  it('replays the frames captured before the probe answered through the live path on a WebGPU device', async () => {
    const probe = deferred<'webgpu'>();
    asr.resolveAsrBackend.mockReturnValueOnce(probe.promise);
    backend = null;
    const { meeting } = await import('./index');
    const started = meeting.start({ mode: 'mic' });
    await tick();
    const node = FakeAudioWorkletNode.instances[0];
    for (let i = 0; i < 3; i += 1) sendFrame(node);
    expect(asr.pushLiveAudio).not.toHaveBeenCalled();

    backend = 'webgpu';
    probe.resolve('webgpu');
    await started;
    sendFrame(node);

    expect(asr.pushLiveAudio.mock.calls.map((c) => c[2])).toEqual([0, 1600, 3200, 4800]);
    expect(asr.bufferRecordedAudio).not.toHaveBeenCalled();
    await meeting.stop();
  });

  it('still flushes the live window on Stop after a mid-session fall to WASM', async () => {
    backend = 'webgpu';
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'mic' });
    backend = 'wasm';
    await meeting.stop();
    expect(asr.flushLiveAudio).toHaveBeenCalledTimes(1);
    expect(asr.transcribeRecordedAudioAfterStop).not.toHaveBeenCalled();
  });

  it('keeps mic and call audio apart while both are heard: each frame reaches ASR under its own source, on its own clock', async () => {
    backend = 'webgpu';
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    const [mic, call] = FakeAudioWorkletNode.instances;
    for (let i = 0; i < 3; i += 1) {
      sendFrame(call);
      sendFrame(mic);
    }
    expect(asr.pushLiveAudio.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      ['system', 0], ['mic', 0],
      ['system', 1600], ['mic', 1600],
      ['system', 3200], ['mic', 3200],
    ]);
    await meeting.stop();
  });

  it('runs the overlap second pass on Stop after the last window and turns are flushed, before the engine is reset', async () => {
    backend = 'webgpu';
    const order: string[] = [];
    asr.flushLiveAudio.mockImplementation(async () => {
      order.push('flush');
    });
    asr.resetBrowserASR.mockImplementation(() => order.push('reset'));
    const pass = await import('./overlap-retranscribe');
    const flush = vi.spyOn(pass, 'flushOverlapRetranscribe').mockImplementation(async () => {
      order.push('overlap');
    });
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'mic' });
    await meeting.stop();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['flush', 'overlap', 'reset']);
  });

  it('does not start diarization for a previous session whose model load settles late', async () => {
    backend = 'webgpu';
    const firstLoad = deferred<boolean>();
    const secondLoad = deferred<boolean>();
    asr.ensureBrowserASRReady.mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise);
    const { meeting } = await import('./index');

    await meeting.start({ mode: 'mic' });
    await meeting.stop();
    await meeting.start({ mode: 'both' });

    firstLoad.resolve(true);
    await tick();
    expect(startDiarization).not.toHaveBeenCalled();

    secondLoad.resolve(true);
    await tick();
    expect(startDiarization.mock.calls).toEqual([[['mic', 'system']]]);
    await meeting.stop();
  });
});
