import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FakeAudioWorkletNode,
  getDisplayMediaMock,
  getUserMediaMock,
  installBrowserStubs,
  uninstallBrowserStubs,
} from './index.testUtils';

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
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');

    await meeting.start({ mode: 'mic' });

    expect(getUserMediaMock).toHaveBeenCalled();
    expect(getState().status).toBe('live');
    expect(getState().error).toBeNull();

    await meeting.stop();
  });

  it('surfaces a visible error instead of a silent no-op when the mic is denied', async () => {
    getUserMediaMock.mockRejectedValueOnce(new Error('Permission denied'));
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');

    await meeting.start({ mode: 'mic' });

    expect(getState().status).toBe('error');
    expect(getState().error).toMatch(/permission denied/i);

    await meeting.start({ mode: 'mic' });
    expect(getState().status).toBe('live');
    await meeting.stop();
  });

  it('calls getDisplayMedia synchronously (before the first await) — required for user-activation', async () => {
    const { meeting } = await import('./index');

    const startPromise = meeting.start({ mode: 'both' });
    expect(getDisplayMediaMock).toHaveBeenCalled();

    await startPromise;
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    const { getState } = await import('./store-core');
    expect(getState().status).toBe('live');
    await meeting.stop();
  });

  it('continues mic-only, silently, when call audio is declined in "both" mode', async () => {
    getDisplayMediaMock.mockRejectedValueOnce(new Error('Permission denied'));
    const { meeting, getCallAudioMissing } = await import('./index');
    const { getState } = await import('./store-core');

    await meeting.start({ mode: 'both' });

    expect(getState().status).toBe('live');
    expect(getState().error).toBeNull();
    expect(getState().warning).toBeNull();
    expect(getCallAudioMissing()).toBe(true);

    await meeting.stop();
  });

  it('requests the mic only once even if start() is invoked twice back-to-back, e.g. a double-click before Record disables', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');

    const first = meeting.start({ mode: 'mic' });
    const second = meeting.start({ mode: 'mic' });
    await Promise.all([first, second]);

    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(getState().status).toBe('live');

    await meeting.stop();
  });

  it('recovers from a stale in-flight status with no real session behind it', async () => {
    const { meeting } = await import('./index');
    const { getState, setState } = await import('./store-core');

    setState({ status: 'live' });

    await meeting.start({ mode: 'mic' });

    expect(getUserMediaMock).toHaveBeenCalled();
    expect(getState().status).toBe('live');

    await meeting.stop();
  });

  it('hands captured audio to the ASR engine instead of dropping it', async () => {
    const { meeting } = await import('./index');
    const { getBrowserASREnabled } = await import('./asr/controls');
    const { getBrowserASRPhase } = await import('./asr/phase');

    await meeting.start({ mode: 'mic' });

    expect(getBrowserASREnabled()).toBe(true);

    const node = FakeAudioWorkletNode.instances[0];
    expect(node).toBeDefined();
    node.port.onmessage?.({
      data: { type: 'frame', rms: 0.2, pcm: new Float32Array([0.1, 0.2]).buffer },
    } as unknown as MessageEvent);
    await Promise.resolve();
    expect(getBrowserASRPhase()).not.toBe('idle');

    await meeting.stop();
  });

  it('buffers the recording and says so on a device without WebGPU', async () => {
    const { meeting } = await import('./index');
    const { getBrowserASRPhase, getBrowserASRStatusMessage } = await import('./asr/phase');
    const { bufferedSeconds } = await import('./post-stop-buffer');

    await meeting.start({ mode: 'mic' });
    expect(getBrowserASRPhase()).toBe('post-stop');
    expect(getBrowserASRStatusMessage()).toMatch(/transcribed after you stop/i);

    const node = FakeAudioWorkletNode.instances[0];
    for (let i = 0; i < 3; i += 1) {
      node.port.onmessage?.({
        data: { type: 'frame', rms: 0.2, pcm: new Int16Array(1600).buffer },
      } as unknown as MessageEvent);
    }
    await Promise.resolve();

    expect(bufferedSeconds().mic).toBeCloseTo(0.3, 5);

    await meeting.stop();
  });
});
