import { describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SILENT_SHARE_FRAMES } from './capture-constants';
import { FakeHelperSocket, helperFrame } from './helper-test-socket';
import { SAFARI, env, handler, socket, stubBrowser, registerHelperEnv } from './capture-helper.testUtils';

registerHelperEnv();

describe('Safari with the helper running', () => {
  it('records the mic through the helper in Both mode, never opening it in Safari', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('both');
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    expect(env.getUserMedia).not.toHaveBeenCalled();
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
    expect(env.getUserMedia).not.toHaveBeenCalled();
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
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('fails without opening the mic when the helper is not running', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.reset('refused');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper.*not running/i);
    expect(cap.activeSources).toEqual([]);
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
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
