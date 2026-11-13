import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SILENT_MIC_FRAMES, SILENT_MIC_WARNING } from './capture-constants';
import { fakeTrack, handler, installCaptureEnv, MIC, postFrames, SYSTEM } from './capture.testUtils';

let getDisplayMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ getDisplayMedia } = installCaptureEnv());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('capture diagnostics', () => {
  it('reports each source: track settings, level, digital-zero and sound frames, shared surface', async () => {
    const shareTrack = {
      ...fakeTrack(),
      label: 'System Audio',
      readyState: 'live',
      muted: false,
      enabled: true,
      getSettings: () => ({ echoCancellation: false, autoGainControl: false, sampleRate: 48000, channelCount: 2 }),
    };
    const tracks: unknown[] = [
      shareTrack,
      { kind: 'video', stop: vi.fn(), getSettings: () => ({ displaySurface: 'monitor' }) },
    ];
    getDisplayMedia.mockResolvedValue({
      getTracks: () => tracks,
      getAudioTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'audio'),
      getVideoTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'video'),
      removeTrack: (t: unknown) => tracks.splice(tracks.indexOf(t), 1),
    });
    const cap = new Capture(handler);
    await cap.start('both');
    postFrames(SYSTEM, 2, 0);
    postFrames(SYSTEM, 1, 0.02);
    postFrames(MIC, 1, 0.1);
    const diag = cap.diagnostics();
    expect(diag).toMatchObject({ mode: 'both', displaySurface: 'monitor', micCancelsEcho: true, shareError: null });
    expect(diag.sources.system).toMatchObject({ frames: 3, zeroFrames: 2, soundFrames: 1, rms: 0.02, peakRms: 0.02 });
    expect(diag.sources.system?.tracks[0]).toMatchObject({
      label: 'System Audio',
      muted: false,
      echoCancellation: false,
      autoGainControl: false,
      sampleRate: 48000,
      channelCount: 2,
    });
    expect(diag.sources.mic).toMatchObject({ frames: 1, zeroFrames: 0, soundFrames: 1 });
    await cap.dispose();
  });

  it('says why the share did not attach', async () => {
    getDisplayMedia.mockRejectedValueOnce(new Error('Permission denied'));
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.diagnostics()).toMatchObject({ shareError: 'Call audio: Permission denied', micCancelsEcho: false });
    expect(cap.diagnostics().sources.system).toBeUndefined();
    await cap.dispose();
  });
});

describe('a mic that delivers only digital silence', () => {
  it('warns once, after SILENT_MIC_FRAMES zero frames in a row', async () => {
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('both');
    postFrames(MIC, SILENT_MIC_FRAMES - 1, 0);
    expect(onWarning).not.toHaveBeenCalled();
    postFrames(MIC, 1, 0);
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(SILENT_MIC_WARNING);
    postFrames(MIC, SILENT_MIC_FRAMES, 0);
    expect(onWarning).toHaveBeenCalledOnce();
    await cap.dispose();
  });

  it('stays quiet for a mic with a noise floor, however quiet', async () => {
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('mic');
    for (let i = 0; i < SILENT_MIC_FRAMES * 3; i += 1) postFrames(MIC, 1, i % 10 === 0 ? 1e-6 : 0);
    expect(onWarning).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('stays quiet when a mic that has delivered sound later falls silent', async () => {
    const onWarning = vi.fn();
    const cap = new Capture({ ...handler, onWarning });
    await cap.start('both');
    postFrames(MIC, 1, 0.05);
    postFrames(MIC, SILENT_MIC_FRAMES * 3, 0);
    expect(onWarning).not.toHaveBeenCalled();
    await cap.dispose();
  });
});
