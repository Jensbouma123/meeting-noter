import { describe, expect, it } from 'vitest';
import { Capture } from './capture';
import { probeHelper } from './helper-connection';
import { FakeHelperSocket } from './helper-test-socket';
import { CHROME, SAFARI, env, handler, socket, stubBrowser, registerHelperEnv } from './capture-helper.testUtils';

registerHelperEnv();

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
    expect(env.getDisplayMedia).toHaveBeenCalledTimes(1);
    await started;
    expect(cap.diagnostics().systemVia).toBe('share');
    expect(FakeHelperSocket.instances).toHaveLength(1);
    expect(socket().started).toBe(false);
    await cap.dispose();

    const next = new Capture(handler);
    await next.start('both');
    expect(env.getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(next.diagnostics().systemVia).toBe('helper');
    await next.dispose();
  });

  it('uses a helper a probe found instead of the share, with the mic cancelling its echo', async () => {
    stubBrowser(CHROME);
    await probeHelper();
    const cap = new Capture(handler);
    await cap.start('both');
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    expect(cap.activeSources.sort()).toEqual(['mic', 'system']);
    expect(env.getUserMedia).toHaveBeenCalledWith(
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
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    expect(FakeHelperSocket.instances).toHaveLength(0);
    await cap.dispose();
  });
});
