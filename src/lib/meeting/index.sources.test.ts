import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAudioWorkletNode, deferred, sendFrame, tick } from './index.testUtils';
import { installRaceHarness, uninstallRaceHarness } from './index.races.testUtils';
import type { RaceHarness } from './types/race-harness';

describe('meeting session audio sources and stop ordering', () => {
  let race: RaceHarness;

  beforeEach(() => {
    race = installRaceHarness();
  });

  afterEach(uninstallRaceHarness);

  it('keeps mic and call audio apart while both are heard: each frame reaches ASR under its own source, on its own clock', async () => {
    race.backend = 'webgpu';
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'both' });
    const [mic, call] = FakeAudioWorkletNode.instances;
    for (let i = 0; i < 3; i += 1) {
      sendFrame(call);
      sendFrame(mic);
    }
    expect(race.asr.pushLiveAudio.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      ['system', 0], ['mic', 0],
      ['system', 1600], ['mic', 1600],
      ['system', 3200], ['mic', 3200],
    ]);
    await meeting.stop();
  });

  it('runs the overlap second pass on Stop after the last window and turns are flushed, before the engine is reset', async () => {
    race.backend = 'webgpu';
    const order: string[] = [];
    race.asr.flushLiveAudio.mockImplementation(async () => {
      order.push('flush');
    });
    race.asr.resetBrowserASR.mockImplementation(() => order.push('reset'));
    const pass = await import('./overlap-retranscribe');
    const flush = vi.spyOn(pass, 'flushOverlapRetranscribe').mockImplementation(async () => {
      order.push('overlap');
    });
    const { meeting } = await import('./index');
    await meeting.start({ mode: 'mic' });
    await meeting.stop();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['flush', 'overlap', 'reset']);
  });

  it('does not start diarization for a previous session whose model load settles late', async () => {
    race.backend = 'webgpu';
    const firstLoad = deferred<boolean>();
    const secondLoad = deferred<boolean>();
    race.asr.ensureBrowserASRReady.mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise);
    const { meeting } = await import('./index');

    await meeting.start({ mode: 'mic' });
    await meeting.stop();
    await meeting.start({ mode: 'both' });

    firstLoad.resolve(true);
    await tick();
    expect(race.startDiarization).not.toHaveBeenCalled();

    secondLoad.resolve(true);
    await tick();
    expect(race.startDiarization.mock.calls).toEqual([[['mic', 'system']]]);
    await meeting.stop();
  });
});
