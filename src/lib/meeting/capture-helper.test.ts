import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture, SAFARI_MIC_NEEDS_HELPER, SILENT_SHARE_FRAMES } from './capture';
import { probeHelper, resetHelperReachability } from './helper-connection';
import { FakeHelperSocket, helperFrame } from './helper-test-socket';

/**
 * Call audio from the native system audio helper (`helper-source.ts`): the
 * route Safari has, whose shares carry no audio, and one Chrome takes once a
 * probe has found the helper running.
 */

function fakeStream(video = false) {
  const track = { kind: 'audio', stop: vi.fn(), onended: null, applyConstraints: vi.fn().mockResolvedValue(undefined) };
  const tracks: unknown[] = [track];
  if (video) tracks.push({ kind: 'video', stop: vi.fn() });
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'video'),
    removeTrack: (t: unknown) => tracks.splice(tracks.indexOf(t), 1),
  } as unknown as MediaStream;
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
  port = { onmessage: null, close: vi.fn() };
  disconnect = vi.fn();
}

const SAFARI = {
  vendor: 'Apple Computer, Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15',
};
const CHROME = {
  vendor: 'Google Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
};

const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn(), onCallAudioSilent: vi.fn() };
let getUserMedia: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;

function stubBrowser(ua: typeof SAFARI): void {
  vi.stubGlobal('navigator', { ...ua, mediaDevices: { getUserMedia, getDisplayMedia } });
}

function socket(): FakeHelperSocket {
  const ws = FakeHelperSocket.instances.at(-1);
  if (!ws) throw new Error('no helper socket opened');
  return ws;
}

beforeEach(() => {
  vi.clearAllMocks();
  FakeHelperSocket.reset();
  resetHelperReachability();
  getUserMedia = vi.fn().mockImplementation(async () => fakeStream());
  getDisplayMedia = vi.fn().mockImplementation(async () => fakeStream(true));
  vi.stubGlobal('window', { AudioContext: FakeAudioContext, WebSocket: FakeHelperSocket });
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Safari with the helper running', () => {
  it('records the mic through the helper in Both mode, never opening it in Safari', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(socket().askedMic).toBe(true);
    expect(cap.activeSources).toEqual(['system']);
    expect(cap.warning).toMatch(/system audio helper records it instead/);
    const diag = cap.diagnostics();
    expect(diag.systemVia).toBe('helper');
    expect(diag.callAudioUnsupported).toBe(false);
    expect(diag.shareError).toBeNull();
    expect(diag.sources.system?.tracks[0]).toMatchObject({ readyState: 'live', sampleRate: 16000, channelCount: 1 });
    await cap.dispose();
  });

  it('feeds helper frames to the same frame and level handlers a share feeds', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    socket().samples(helperFrame(3277));
    expect(handler.onFrame).toHaveBeenCalledWith('system', expect.any(ArrayBuffer));
    expect((handler.onFrame.mock.calls[0][1] as ArrayBuffer).byteLength).toBe(3200);
    expect(handler.onLevel).toHaveBeenCalledWith('system', expect.closeTo(0.1, 3));
    expect(cap.diagnostics().sources.system).toMatchObject({ frames: 1, soundFrames: 1 });
    await cap.dispose();
  });

  it('tells the user their mic is left out when the helper has no Microphone permission', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.mic = 'denied';
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual(['system']);
    expect(cap.warning).toMatch(/microphone is not recorded.*no Microphone permission/);
    await cap.dispose();
  });

  it('keeps recording system audio when the helper has no mic, and says so', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.mic = undefined;
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['system']);
    expect(cap.warning).toMatch(/microphone is not recorded.*rebuild it/);
    socket().samples(helperFrame(1000));
    expect(handler.onFrame).toHaveBeenCalledWith('system', expect.any(ArrayBuffer));
    await cap.dispose();
  });

  it('follows the helper mic going away mid-session', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    socket().text({ type: 'mic', mic: 'unavailable', micError: 'no default input device', micPermission: 'granted' });
    expect(cap.warning).toMatch(/not recorded.*no default input device/);
    expect(cap.diagnostics().sources.system?.tracks[0].label).toMatch(/mic: unavailable/);
    await cap.dispose();
  });

  it('tells the user at once when the helper mic turns out to deliver only silence', async () => {
    stubBrowser(SAFARI);
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('both');
    expect(onWarning).not.toHaveBeenCalled();
    socket().text({ type: 'mic', mic: 'silent', micError: 'MacBook Pro Microphone delivers only silence', micPermission: 'unknown' });
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/microphone is not recorded.*only silence.*Microphone permission/));
    expect(cap.diagnostics().sources.system?.tracks[0].label).toMatch(/mic: silent/);
    socket().text({ type: 'mic', mic: 'live', micPermission: 'granted' });
    expect(onWarning).toHaveBeenCalledOnce();
    expect(cap.warning).toMatch(/system audio helper records it instead/);
    await cap.dispose();
  });

  it('records the call alone in system mode', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('system');
    expect(socket().askedMic).toBe(false);
    expect(cap.warning).toBeNull();
    expect(cap.activeSources).toEqual(['system']);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('fails without opening the mic when the helper is not running', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.reset('refused');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper.*not running/i);
    expect(cap.activeSources).toEqual([]);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(cap.diagnostics().callAudioUnsupported).toBe(true);
    expect(cap.diagnostics().shareError).toMatch(/Safari does not share call audio.*helper/);
    await cap.dispose();
  });

  it('flags a helper that streams only silence (no System Audio Recording permission)', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    for (let i = 0; i < SILENT_SHARE_FRAMES; i += 1) socket().samples(helperFrame(0));
    expect(handler.onCallAudioSilent).toHaveBeenCalledWith(true);
    expect(cap.diagnostics().shareSilent).toBe(true);
    socket().samples(helperFrame(1000));
    expect(handler.onCallAudioSilent).toHaveBeenLastCalledWith(false);
    await cap.dispose();
  });
});

describe('helper lifetime', () => {
  it('ends the system source when the helper quits mid-session', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    socket().drop();
    expect(handler.onSourceEnded).toHaveBeenCalledWith('system');
    cap.dropSource('system');
    expect(cap.activeSources).toEqual([]);
    await cap.dispose();
  });

  it('dispose asks the helper to stop and closes the socket', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    await cap.dispose();
    expect(socket().sent.map((m) => JSON.parse(m).type)).toEqual(['start', 'stop']);
    expect(socket().closed).toBe(true);
    expect(cap.activeSources).toEqual([]);
  });

  it('a helper that connects after Stop is closed on arrival', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    const started = cap.start('both');
    await cap.dispose();
    await started;
    expect(cap.activeSources).toEqual([]);
    expect(FakeHelperSocket.instances.every((ws) => ws.closed)).toBe(true);
  });
});

describe('Chrome', () => {
  it('keeps the share path when no probe has found the helper, and probes for the next session', async () => {
    stubBrowser(CHROME);
    const cap = new Capture(handler);
    const started = cap.start('both');
    // Asked synchronously, inside the click's user activation.
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    await started;
    expect(cap.diagnostics().systemVia).toBe('share');
    // The probe only says hello: it never starts the tap.
    expect(FakeHelperSocket.instances).toHaveLength(1);
    expect(socket().started).toBe(false);
    await cap.dispose();

    const next = new Capture(handler);
    await next.start('both');
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(next.diagnostics().systemVia).toBe('helper');
    await next.dispose();
  });

  it('uses a helper a probe found instead of the share, with the mic cancelling its echo', async () => {
    stubBrowser(CHROME);
    await probeHelper();
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(cap.activeSources.sort()).toEqual(['mic', 'system']);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: true }) }),
    );
    await cap.dispose();
  });

  it('records the mic alone when a helper found earlier has quit since', async () => {
    stubBrowser(CHROME);
    await probeHelper();
    FakeHelperSocket.reset('refused');
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic']);
    expect(cap.diagnostics().shareError).toMatch(/^Call audio: .*not running/);
    expect(cap.diagnostics().callAudioUnsupported).toBe(false);
    await cap.dispose();
  });

  it('leaves mic-only recording alone: no share, no helper', async () => {
    stubBrowser(CHROME);
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(FakeHelperSocket.instances).toHaveLength(0);
    await cap.dispose();
  });

});

describe('Safari mic-only capture', () => {
  it('records the mic alone through the helper, never opening it in Safari', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(JSON.parse(socket().sent[0])).toEqual({ type: 'start', mic: true, system: false });
    expect(cap.activeSources).toEqual(['mic']);
    expect(cap.warning).toMatch(/helper records it instead\. Your other call/);
    socket().samples(helperFrame(3277));
    expect(handler.onFrame).toHaveBeenCalledExactlyOnceWith('mic', expect.any(ArrayBuffer));
    expect(handler.onLevel).toHaveBeenCalledWith('mic', expect.closeTo(0.1, 3));
    const diag = cap.diagnostics();
    expect(diag.systemVia).toBeNull();
    expect(diag.sources.mic).toMatchObject({ frames: 1, soundFrames: 1 });
    expect(diag.sources.mic?.tracks[0].label).toMatch(/mic alone: live/);
    await cap.dispose();
    expect(socket().closed).toBe(true);
  });

  it('never flags a quiet room as silent call audio', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('mic');
    for (let i = 0; i < SILENT_SHARE_FRAMES + 1; i += 1) socket().samples(helperFrame(0));
    expect(handler.onCallAudioSilent).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('ends the mic source when the helper quits mid-session', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('mic');
    socket().drop();
    expect(handler.onSourceEnded).toHaveBeenCalledExactlyOnceWith('mic');
    await cap.dispose();
  });

  it('warns at once when the helper mic goes silent mid-session', async () => {
    stubBrowser(SAFARI);
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('mic');
    socket().text({ type: 'mic', mic: 'silent', micError: 'delivers only silence', micPermission: 'unknown' });
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/microphone is not recorded.*only silence/));
    expect(cap.warning).not.toMatch(/system audio only/);
    await cap.dispose();
  });

  it('fails with how to start the helper, in Dutch, when it is not running', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.reset('refused');
    const cap = new Capture(handler);
    const err = await cap.start('mic').then(() => null, (e: Error) => e);
    expect(err?.message).toBe(SAFARI_MIC_NEEDS_HELPER);
    expect(err?.message).toMatch(/audiohelper.*draait niet.*Start Meeting Noter\.command.*npm run app/);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual([]);
  });

  it('fails without opening the mic when the helper has no Microphone permission', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.mic = 'denied';
    const cap = new Capture(handler);
    await expect(cap.start('mic')).rejects.toThrow(/microphone is not recorded.*no Microphone permission/);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual([]);
    expect(socket().closed).toBe(true);
  });

  it('passes on what a running helper says when it cannot start', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.reset('tap-fails');
    const cap = new Capture(handler);
    await expect(cap.start('mic')).rejects.toThrow(/^Microphone: Could not start/);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
