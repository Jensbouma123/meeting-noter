import { describe, expect, it } from 'vitest';
import {
  deferred,
  env,
  expectAllReleased,
  fakeStream,
  flush,
  tracks,
  registerLifecycleEnv,
} from './capture-lifecycle.testUtils';

registerLifecycleEnv();

describe('meeting: every acquired track is stopped', () => {
  it('requests nothing before Record: importing the module never touches the mic', async () => {
    await import('./index');
    await import('./browser-asr');
    await flush();
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
  });

  it('on start then stop', async () => {
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    await meeting.stop();
    expectAllReleased();
    expect(env.getUserMedia).toHaveBeenCalledTimes(1);
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
    env.getUserMedia.mockReturnValueOnce(pending.promise);
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
    env.getUserMedia.mockReturnValueOnce(pending.promise);
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
});
