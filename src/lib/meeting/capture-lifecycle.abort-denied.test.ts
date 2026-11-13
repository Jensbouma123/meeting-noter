import { describe, expect, it } from 'vitest';
import {
  contexts,
  deferred,
  env,
  expectAllReleased,
  fakeStream,
  flush,
  installBrowser,
  SAFARI,
  tracks,
  registerLifecycleEnv,
} from './capture-lifecycle.testUtils';

registerLifecycleEnv();

describe('meeting: every acquired track is stopped', () => {
  it('on a denied mic', async () => {
    env.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    const { meeting } = await import('./index');
    const { getState } = await import('./store');
    await meeting.start({ mode: 'both' });
    expect(getState().status).toBe('error');
    expectAllReleased();
  });

  it('on a denied share in "both" mode', async () => {
    env.getDisplayMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    await meeting.stop();
    expectAllReleased();
  });

  it('on Safari', async () => {
    installBrowser(SAFARI);
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    await meeting.stop();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    expect(env.getUserMedia).not.toHaveBeenCalled();
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
    env.win.dispatchEvent(new Event('pagehide'));
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
    await flush();
    expectAllReleased();
  });

  it('on pagehide while the permission prompt is still open', async () => {
    const pending = deferred<MediaStream>();
    env.getUserMedia.mockReturnValueOnce(pending.promise);
    const { meeting } = await import('./index');
    const started = meeting.start({ mode: 'mic' });
    env.win.dispatchEvent(new Event('pagehide'));
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
