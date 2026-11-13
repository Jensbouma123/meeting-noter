import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeAudioWorkletNode, deferred, getUserMediaMock, sendFrame, tick } from './index.testUtils';
import { installRaceHarness, uninstallRaceHarness, type RaceHarness } from './index.races.testUtils';

describe('meeting session lifecycle races', () => {
  let race: RaceHarness;

  beforeEach(() => {
    race = installRaceHarness();
  });

  afterEach(uninstallRaceHarness);

  it('joins a second stop() to the one in flight instead of re-running the teardown', async () => {
    const run = deferred<boolean>();
    race.asr.transcribeRecordedAudioAfterStop.mockReturnValueOnce(run.promise);
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');
    await meeting.start({ mode: 'mic' });

    const first = meeting.stop();
    expect(getState().status).toBe('stopping');
    await tick();
    let secondSettled = false;
    const second = meeting.stop().then(() => {
      secondSettled = true;
    });
    await tick();

    expect(secondSettled).toBe(false);
    expect(race.asr.resetBrowserASR).toHaveBeenCalledTimes(1);
    expect(race.asr.transcribeRecordedAudioAfterStop).toHaveBeenCalledTimes(1);
    expect(getState().status).toBe('stopping');

    run.resolve(true);
    await Promise.all([first, second]);
    expect(getState().status).toBe('idle');
  });

  it('refuses a start() while the previous stop is still flushing, leaving nothing for that stop to tear down', async () => {
    const run = deferred<boolean>();
    race.asr.transcribeRecordedAudioAfterStop.mockReturnValueOnce(run.promise);
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');
    await meeting.start({ mode: 'mic' });

    const stopped = meeting.stop();
    await meeting.start({ mode: 'mic' });
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(getState().warning).toMatch(/previous recording/i);

    run.resolve(true);
    await stopped;
    expect(getState().status).toBe('idle');

    await meeting.start({ mode: 'mic' });
    expect(getState().status).toBe('live');
    await meeting.stop();
  });

  it('replays the frames captured before the probe answered through the live path on a WebGPU device', async () => {
    const probe = deferred<'webgpu'>();
    race.asr.resolveAsrBackend.mockReturnValueOnce(probe.promise);
    race.backend = null;
    const { meeting } = await import('./index');
    const started = meeting.start({ mode: 'mic' });
    await tick();
    const node = FakeAudioWorkletNode.instances[0];
    for (let i = 0; i < 3; i += 1) sendFrame(node);
    expect(race.asr.pushLiveAudio).not.toHaveBeenCalled();

    race.backend = 'webgpu';
    probe.resolve('webgpu');
    await started;
    sendFrame(node);

    expect(race.asr.pushLiveAudio.mock.calls.map((c) => c[2])).toEqual([0, 1600, 3200, 4800]);
    expect(race.asr.bufferRecordedAudio).not.toHaveBeenCalled();
    await meeting.stop();
  });

  it('leaves no segment "Identifying" once Stop has finished, including the post-stop pass\'s', async () => {
    const { meeting } = await import('./index');
    const { getState } = await import('./store-core');
    const { upsertSegment } = await import('./segment-store');
    race.asr.transcribeRecordedAudioAfterStop.mockImplementationOnce(async () => {
      upsertSegment({ id: 'tail', source: 'mic', speaker: 'mic:0', text: 'last words', start: 9, end: 10, final: true, unconfirmed: true });
      return true;
    });
    await meeting.start({ mode: 'mic' });
    await meeting.stop();

    expect(getState().status).toBe('idle');
    expect(getState().segments.map((s) => [s.id, !!s.unconfirmed])).toEqual([['tail', false]]);
  });

  it('still flushes the live window on Stop after a mid-session fall to WASM', async () => {
    race.backend = 'webgpu';
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'mic' });
    race.backend = 'wasm';
    await meeting.stop();
    expect(race.asr.flushLiveAudio).toHaveBeenCalledTimes(1);
    expect(race.asr.transcribeRecordedAudioAfterStop).not.toHaveBeenCalled();
  });
});
