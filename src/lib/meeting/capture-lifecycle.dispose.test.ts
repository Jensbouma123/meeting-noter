import { describe, expect, it, vi } from 'vitest';
import {
  contexts,
  deferred,
  env,
  expectAllReleased,
  fakeStream,
  flush,
  useLifecycleEnv,
} from './capture-lifecycle.testUtils';

useLifecycleEnv();

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
    env.getUserMedia.mockReturnValueOnce(pending.promise);
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
    env.getDisplayMedia.mockReturnValueOnce(share.promise);
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
    env.getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/microphone/i);
    expectAllReleased();
  });

  it('when the share is denied in "both" mode (the mic keeps recording until dispose)', async () => {
    env.getDisplayMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { Capture } = await import('./capture');
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic']);
    await cap.dispose();
    expectAllReleased();
  });
});
