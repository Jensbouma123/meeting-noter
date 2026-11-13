import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SAFARI_MIC_NEEDS_HELPER, SHARE_SOUND_RMS, SILENT_MIC_FRAMES, SILENT_MIC_WARNING, SILENT_SHARE_FRAMES } from './capture-constants';

/**
 * Meeting audio played through the speakers reaches a mic-only recording only
 * if echo cancellation is off: cancelling what the speakers play is its whole
 * job. With call audio attached it stays on, so the far side is not heard
 * twice (once as the call source, once through the mic).
 */

function fakeTrack() {
  return {
    kind: 'audio',
    stop: vi.fn(),
    onended: null,
    getConstraints: () => ({ echoCancellation: true, noiseSuppression: true }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
}

function fakeStream(track = fakeTrack(), video = false) {
  const tracks: unknown[] = [track];
  if (video) tracks.push({ kind: 'video', stop: vi.fn() });
  return {
    track,
    stream: {
      getTracks: () => tracks,
      getAudioTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'audio'),
      getVideoTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'video'),
      removeTrack: (t: unknown) => tracks.splice(tracks.indexOf(t), 1),
    } as unknown as MediaStream,
  };
}

class FakeAudioContext {
  state = 'running';
  sampleRate = 48000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

class FakeAudioWorkletNode {
  static instances: FakeAudioWorkletNode[] = [];
  port: { onmessage: ((ev: MessageEvent) => void) | null; close: () => void } = { onmessage: null, close: vi.fn() };
  disconnect = vi.fn();
  constructor() {
    FakeAudioWorkletNode.instances.push(this);
  }
}

const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn(), onCallAudioSilent: vi.fn() };

let mic: ReturnType<typeof fakeStream>;
let getDisplayMedia: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  FakeAudioWorkletNode.instances.length = 0;
  handler.onCallAudioSilent.mockClear();
  mic = fakeStream();
  getDisplayMedia = vi.fn().mockResolvedValue(fakeStream(fakeTrack(), true).stream);
  getUserMedia = vi.fn().mockResolvedValue(mic.stream);
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia, getDisplayMedia },
  });
  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Safari: no getDisplayMedia audio support', () => {
  function stubSafari(): void {
    vi.stubGlobal('navigator', {
      vendor: 'Apple Computer, Inc.',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
      mediaDevices: { getUserMedia, getDisplayMedia },
    });
  }

  it('does not open a share prompt or microphone in Safari when the helper is unavailable', async () => {
    stubSafari();
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper/);
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual([]);
    expect(cap.diagnostics().callAudioUnsupported).toBe(true);
    expect(cap.diagnostics().shareError).toMatch(/Safari does not share call audio/);
    await cap.dispose();
  });

  it('asks the system audio helper in system mode, not a share, and throws when the helper does not answer', async () => {
    stubSafari();
    const cap = new Capture(handler);
    await expect(cap.start('system')).rejects.toThrow(/Safari does not share call audio.*system audio helper/);
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });

  it('fails Safari mic-only capture without a helper, never opening a microphone stream', async () => {
    stubSafari();
    const cap = new Capture(handler);
    await expect(cap.start('mic')).rejects.toThrow(SAFARI_MIC_NEEDS_HELPER);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });
});

describe('mic echo cancellation', () => {
  it('is requested off up front for a mic-only recording — one getUserMedia call, no reconfiguration after', async () => {
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: false, noiseSuppression: true }) }),
    );
    // The initial request already asked for the right thing, so the track
    // is never reconfigured — mode 'mic' never wanted a call source to
    // begin with, unlike the "both, but it didn't attach" case below.
    expect(mic.track.applyConstraints).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('is requested off when call audio could not be shared (declined picker), never reconfigured', async () => {
    getDisplayMedia.mockRejectedValue(new Error('NotAllowedError'));
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic']);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: false }) }),
    );
    // Reconfiguring the live track is what asked for the mic a second time.
    expect(mic.track.applyConstraints).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('is requested on when call audio is its own source', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic', 'system']);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: true }) }),
    );
    expect(mic.track.applyConstraints).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('is decided by the share, so the mic is requested only once the share settles', async () => {
    let resolveShare!: (s: MediaStream) => void;
    getDisplayMedia.mockReturnValueOnce(new Promise<MediaStream>((r) => (resolveShare = r)));
    const cap = new Capture(handler);
    const started = cap.start('both');
    await new Promise((r) => setTimeout(r, 0));
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
    resolveShare(fakeStream(fakeTrack(), true).stream);
    await started;
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await cap.dispose();
  });
});

describe('one microphone permission request per session', () => {
  it.each(['mic', 'both'] as const)('calls getUserMedia exactly once for mode %s', async (mode) => {
    const cap = new Capture(handler);
    await cap.start(mode);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
    await cap.dispose();
  });

  it('still calls getUserMedia exactly once when call audio fails to attach in "both" mode', async () => {
    getDisplayMedia.mockRejectedValue(new Error('NotAllowedError'));
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await cap.dispose();
  });
});

describe('shared call audio', () => {
  /** Post `count` 100 ms frames at `rms` from the worklet node attached `nth`. */
  function frames(nth: number, count: number, rms: number): void {
    const node = FakeAudioWorkletNode.instances[nth];
    for (let i = 0; i < count; i += 1) {
      node.port.onmessage?.({ data: { type: 'frame', pcm: new ArrayBuffer(3200), rms } } as MessageEvent);
    }
  }
  const flush = () => new Promise((r) => setTimeout(r, 0));
  // Nodes are attached mic first, then the share.
  const SYSTEM = 1;

  it('turns off echo cancellation, gain control and noise suppression on the share track', async () => {
    const share = fakeStream(fakeTrack(), true);
    getDisplayMedia.mockResolvedValue(share.stream);
    const cap = new Capture(handler);
    await cap.start('both');
    expect(share.track.applyConstraints).toHaveBeenCalledWith({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    await cap.dispose();
  });

  it('still attaches a share whose track cannot be reconfigured', async () => {
    const share = fakeStream(fakeTrack(), true);
    share.track.applyConstraints.mockRejectedValue(new Error('OverconstrainedError'));
    getDisplayMedia.mockResolvedValue(share.stream);
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic', 'system']);
    await cap.dispose();
  });

  // The reported bug: a share with a silent audio track kept the mic's echo
  // cancellation on, which removed the far side from the mic too, so it was
  // transcribed only when the speakers were turned up loud enough to leak.
  it('reopens the mic without echo cancellation when the share stays silent', async () => {
    const second = fakeStream();
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(second.stream);
    const cap = new Capture(handler);
    await cap.start('both', 'usb-mic');
    frames(SYSTEM, SILENT_SHARE_FRAMES - 1, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    frames(SYSTEM, 1, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({ echoCancellation: false, deviceId: { ideal: 'usb-mic' } }),
      }),
    );
    expect(mic.track.stop).toHaveBeenCalled();
    expect(second.track.stop).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual(['system', 'mic']);
    expect(handler.onCallAudioSilent).toHaveBeenCalledWith(true);
    // The share stays attached: once it is heard, call audio is back.
    frames(SYSTEM, 1, 0.05);
    expect(handler.onCallAudioSilent).toHaveBeenLastCalledWith(false);
    await cap.dispose();
    expect(second.track.stop).toHaveBeenCalled();
  });

  it('keeps the reopened mic when the replaced mic track reports ended late', async () => {
    const second = fakeStream();
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(second.stream);
    handler.onSourceEnded.mockClear();
    const cap = new Capture(handler);
    await cap.start('both');
    frames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(cap.activeSources).toEqual(['system', 'mic']);
    (mic.track.onended as unknown as (() => void) | null)?.();
    expect(handler.onSourceEnded).not.toHaveBeenCalled();
    (second.track.onended as unknown as (() => void) | null)?.();
    expect(handler.onSourceEnded).toHaveBeenCalledWith('mic');
    await cap.dispose();
  });

  it('keeps echo cancellation on once the share has been heard', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    frames(SYSTEM, 1, SHARE_SOUND_RMS * 10);
    frames(SYSTEM, SILENT_SHARE_FRAMES * 2, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(handler.onCallAudioSilent).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('does not reopen the mic after the session was stopped', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    await cap.dispose();
    frames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
});

describe('both mode with absent/silent call audio never degrades silently', () => {
  function frames(nth: number, count: number, rms: number): void {
    const node = FakeAudioWorkletNode.instances[nth];
    for (let i = 0; i < count; i += 1) {
      node.port.onmessage?.({ data: { type: 'frame', pcm: new ArrayBuffer(3200), rms } } as MessageEvent);
    }
  }
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const SYSTEM = 1;
  it('flags a silent share in Chrome (earphones: mic reopen cannot hear the call)', async () => {
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(fakeStream().stream);
    const cap = new Capture(handler);
    await cap.start('both');
    frames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(handler.onCallAudioSilent).toHaveBeenCalledWith(true);
    await cap.dispose();
  });

  it('asks for the entire screen with system audio so desktop apps are reachable', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: true,
        systemAudio: 'include',
        video: expect.objectContaining({ displaySurface: 'monitor' }),
      }),
    );
    await cap.dispose();
  });
});

/**
 * The mic got much louder mid-session in "both" mode: Chrome ties gain
 * control to echo cancellation when it is not asked for, so the first mic
 * (echo cancellation on) ran an AGC that raised the macOS input volume, and
 * the replacement opened for a silent share (echo cancellation off) kept it
 * raised with no AGC. Pinned off, the two requests differ in nothing else.
 */
describe('mic gain stays put in "both" mode', () => {
  const SYSTEM = 1;
  const flush = () => new Promise((r) => setTimeout(r, 0));
  function silentShare(count: number): void {
    const node = FakeAudioWorkletNode.instances[SYSTEM];
    for (let i = 0; i < count; i += 1) {
      node.port.onmessage?.({ data: { type: 'frame', pcm: new ArrayBuffer(3200), rms: 0 } } as MessageEvent);
    }
  }
  const audioOf = (call: unknown[]) => (call[0] as { audio: MediaTrackConstraints }).audio;

  it('pins gain control off on the mic, with the share attached or not', async () => {
    const cap = new Capture(handler);
    await cap.start('both', 'usb-mic');
    expect(audioOf(getUserMedia.mock.calls[0])).toEqual({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      deviceId: { ideal: 'usb-mic' },
    });
    await cap.dispose();

    getUserMedia.mockClear();
    getDisplayMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const declined = new Capture(handler);
    await declined.start('both');
    expect(audioOf(getUserMedia.mock.calls[0])).toEqual({
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
    });
    await declined.dispose();
  });

  it('reopens the mic for a silent share with only echo cancellation changed', async () => {
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(fakeStream().stream);
    const cap = new Capture(handler);
    await cap.start('both', 'usb-mic');
    silentShare(SILENT_SHARE_FRAMES);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    const [first, second] = getUserMedia.mock.calls.map(audioOf);
    expect(second).toEqual({ ...first, echoCancellation: false });
    expect(second.autoGainControl).toBe(false);
    expect(cap.diagnostics().micReopens).toBe(1);
    await cap.dispose();
  });

  it('leaves the mic-only request as it was', async () => {
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(audioOf(getUserMedia.mock.calls[0])).toEqual({ echoCancellation: false, noiseSuppression: true });
    await cap.dispose();
  });
});

describe('call audio request', () => {
  it('offers system audio with a shared window too (a desktop app shared as its window)', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, systemAudio: 'include', windowAudio: 'system' }),
    );
    await cap.dispose();
  });
});

describe('capture diagnostics', () => {
  const MIC = 0;
  const SYSTEM = 1;
  function post(nth: number, rms: number): void {
    FakeAudioWorkletNode.instances[nth].port.onmessage?.({
      data: { type: 'frame', pcm: new ArrayBuffer(3200), rms },
    } as MessageEvent);
  }

  it('reports each source: track settings, level, digital-zero and sound frames, shared surface', async () => {
    const shareTrack = {
      ...fakeTrack(),
      label: 'System Audio',
      readyState: 'live',
      muted: false,
      enabled: true,
      getSettings: () => ({ echoCancellation: false, autoGainControl: false, sampleRate: 48000, channelCount: 2 }),
    };
    const tracks: unknown[] = [
      shareTrack,
      { kind: 'video', stop: vi.fn(), getSettings: () => ({ displaySurface: 'monitor' }) },
    ];
    getDisplayMedia.mockResolvedValue({
      getTracks: () => tracks,
      getAudioTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'audio'),
      getVideoTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'video'),
      removeTrack: (t: unknown) => tracks.splice(tracks.indexOf(t), 1),
    });
    const cap = new Capture(handler);
    await cap.start('both');
    post(SYSTEM, 0);
    post(SYSTEM, 0);
    post(SYSTEM, 0.02);
    post(MIC, 0.1);
    const diag = cap.diagnostics();
    expect(diag).toMatchObject({ mode: 'both', displaySurface: 'monitor', micCancelsEcho: true, shareError: null });
    expect(diag.sources.system).toMatchObject({ frames: 3, zeroFrames: 2, soundFrames: 1, rms: 0.02, peakRms: 0.02 });
    expect(diag.sources.system?.tracks[0]).toMatchObject({
      label: 'System Audio',
      muted: false,
      echoCancellation: false,
      autoGainControl: false,
      sampleRate: 48000,
      channelCount: 2,
    });
    expect(diag.sources.mic).toMatchObject({ frames: 1, zeroFrames: 0, soundFrames: 1 });
    await cap.dispose();
  });

  it('says why the share did not attach', async () => {
    getDisplayMedia.mockRejectedValueOnce(new Error('Permission denied'));
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.diagnostics()).toMatchObject({ shareError: 'Call audio: Permission denied', micCancelsEcho: false });
    expect(cap.diagnostics().sources.system).toBeUndefined();
    await cap.dispose();
  });
});

describe('a mic that delivers only digital silence', () => {
  const MIC = 0;
  function post(rms: number): void {
    FakeAudioWorkletNode.instances[MIC].port.onmessage?.({
      data: { type: 'frame', pcm: new ArrayBuffer(3200), rms },
    } as MessageEvent);
  }

  it('warns once, after SILENT_MIC_FRAMES zero frames in a row', async () => {
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('both');
    for (let i = 0; i < SILENT_MIC_FRAMES - 1; i += 1) post(0);
    expect(onWarning).not.toHaveBeenCalled();
    post(0);
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(SILENT_MIC_WARNING);
    for (let i = 0; i < SILENT_MIC_FRAMES; i += 1) post(0);
    expect(onWarning).toHaveBeenCalledOnce();
    await cap.dispose();
  });

  it('stays quiet for a mic with a noise floor, however quiet', async () => {
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('mic');
    for (let i = 0; i < SILENT_MIC_FRAMES * 3; i += 1) post(i % 10 === 0 ? 1e-6 : 0);
    expect(onWarning).not.toHaveBeenCalled();
    await cap.dispose();
  });

  // Chrome's noise suppression (and echo cancellation while the call plays)
  // gates a working mic to exact zero while the user is quiet, so a pause of
  // a few seconds raised the warning on a mic that had already recorded.
  it('stays quiet when a mic that has delivered sound later falls silent', async () => {
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('both');
    post(0.05);
    for (let i = 0; i < SILENT_MIC_FRAMES * 3; i += 1) post(0);
    expect(onWarning).not.toHaveBeenCalled();
    await cap.dispose();
  });
});
