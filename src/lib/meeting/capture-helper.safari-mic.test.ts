import { describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SAFARI_MIC_NEEDS_HELPER, SILENT_SHARE_FRAMES } from './capture-constants';
import { FakeHelperSocket, helperFrame } from './helper-test-socket';
import { SAFARI, env, handler, socket, stubBrowser, registerHelperEnv } from './capture-helper.testUtils';

registerHelperEnv();

describe('Safari mic-only capture', () => {
  it('records the mic alone through the helper, never opening it in Safari', async () => {
    stubBrowser(SAFARI);
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
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
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual([]);
  });

  it('fails without opening the mic when the helper has no Microphone permission', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.mic = 'denied';
    const cap = new Capture(handler);
    await expect(cap.start('mic')).rejects.toThrow(/microphone is not recorded.*no Microphone permission/);
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual([]);
    expect(socket().closed).toBe(true);
  });

  it('passes on what a running helper says when it cannot start', async () => {
    stubBrowser(SAFARI);
    FakeHelperSocket.reset('tap-fails');
    const cap = new Capture(handler);
    await expect(cap.start('mic')).rejects.toThrow(/^Microphone: Could not start/);
    expect(env.getUserMedia).not.toHaveBeenCalled();
  });
});
