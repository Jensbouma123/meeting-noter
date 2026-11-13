import { describe, expect, it, vi } from 'vitest';
import {
  contexts,
  deferred,
  env,
  expectAllReleased,
  fakeStream,
  installBrowser,
  SAFARI,
  tracks,
  useLifecycleEnv,
} from './capture-lifecycle.testUtils';

useLifecycleEnv();

describe('Capture: every acquired track is stopped', () => {
  const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn() };

  it('when the shared surface has no audio track', async () => {
    env.getDisplayMedia.mockResolvedValueOnce(fakeStream({ audio: false, video: true }));
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
    env.win.AudioContext = undefined;
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/web audio/i);
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
  });

  it('when a dispose lands while the share picker is open, the mic is never requested', async () => {
    const share = deferred<MediaStream>();
    env.getDisplayMedia.mockReturnValueOnce(share.promise);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    const started = cap.start('both');
    await cap.dispose();
    share.resolve(fakeStream({ audio: true, video: true }));
    await started;
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expectAllReleased();
  });

  it('on Safari, does not open the mic if the native helper is unavailable', async () => {
    installBrowser(SAFARI);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper/);
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    expect(env.getUserMedia).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('when the user stops sharing mid-session (dropSource)', async () => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('both');
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

  it.each(['both', 'system'] as const)('Chrome/Edge still ask env.getDisplayMedia for audio in "%s" mode', async (mode) => {
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start(mode);
    expect(env.getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(env.getDisplayMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: true }));
    expect(cap.activeSources).toContain('system');
    await cap.dispose();
  });

  it('Safari never asks env.getUserMedia because WebKit can disrupt another call', async () => {
    installBrowser(SAFARI);
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper/);
    expect(env.getUserMedia).not.toHaveBeenCalled();
    expect(env.getDisplayMedia).not.toHaveBeenCalled();
    await cap.dispose();
  });
});
