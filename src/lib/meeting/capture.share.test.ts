import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SHARE_SOUND_RMS, SILENT_SHARE_FRAMES } from './capture-constants';
import { fakeStream, fakeTrack, flush, handler, installCaptureEnv, postFrames, SYSTEM } from './capture.testUtils';

let mic: ReturnType<typeof fakeStream>;
let getUserMedia: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ mic, getUserMedia, getDisplayMedia } = installCaptureEnv());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shared call audio', () => {
  it('turns off echo cancellation, gain control and noise suppression on the share track', async () => {
    const share = fakeStream(fakeTrack(), true);
    getDisplayMedia.mockResolvedValue(share.stream);
    const cap = new Capture(handler);
    await cap.start('both');
    expect(share.track.applyConstraints).toHaveBeenCalledWith({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    await cap.dispose();
  });

  it('still attaches a share whose track cannot be reconfigured', async () => {
    const share = fakeStream(fakeTrack(), true);
    share.track.applyConstraints.mockRejectedValue(new Error('OverconstrainedError'));
    getDisplayMedia.mockResolvedValue(share.stream);
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic', 'system']);
    await cap.dispose();
  });

  it('reopens the mic without echo cancellation when the share stays silent', async () => {
    const second = fakeStream();
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(second.stream);
    const cap = new Capture(handler);
    await cap.start('both', 'usb-mic');
    postFrames(SYSTEM, SILENT_SHARE_FRAMES - 1, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    postFrames(SYSTEM, 1, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({ echoCancellation: false, deviceId: { ideal: 'usb-mic' } }),
      }),
    );
    expect(mic.track.stop).toHaveBeenCalled();
    expect(second.track.stop).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual(['system', 'mic']);
    expect(handler.onCallAudioSilent).toHaveBeenCalledWith(true);
    postFrames(SYSTEM, 1, 0.05);
    expect(handler.onCallAudioSilent).toHaveBeenLastCalledWith(false);
    await cap.dispose();
    expect(second.track.stop).toHaveBeenCalled();
  });

  it('keeps the reopened mic when the replaced mic track reports ended late', async () => {
    const second = fakeStream();
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(second.stream);
    handler.onSourceEnded.mockClear();
    const cap = new Capture(handler);
    await cap.start('both');
    postFrames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(cap.activeSources).toEqual(['system', 'mic']);
    (mic.track.onended as unknown as (() => void) | null)?.();
    expect(handler.onSourceEnded).not.toHaveBeenCalled();
    (second.track.onended as unknown as (() => void) | null)?.();
    expect(handler.onSourceEnded).toHaveBeenCalledWith('mic');
    await cap.dispose();
  });

  it('keeps echo cancellation on once the share has been heard', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    postFrames(SYSTEM, 1, SHARE_SOUND_RMS * 10);
    postFrames(SYSTEM, SILENT_SHARE_FRAMES * 2, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(handler.onCallAudioSilent).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('does not reopen the mic after the session was stopped', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    await cap.dispose();
    postFrames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
});

describe('both mode with absent/silent call audio never degrades silently', () => {
  it('flags a silent share in Chrome (earphones: mic reopen cannot hear the call)', async () => {
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(fakeStream().stream);
    const cap = new Capture(handler);
    await cap.start('both');
    postFrames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(handler.onCallAudioSilent).toHaveBeenCalledWith(true);
    await cap.dispose();
  });

  it('asks for the entire screen with system audio so desktop apps are reachable', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: true,
        systemAudio: 'include',
        video: expect.objectContaining({ displaySurface: 'monitor' }),
      }),
    );
    await cap.dispose();
  });
});

describe('call audio request', () => {
  it('offers system audio with a shared window too (a desktop app shared as its window)', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getDisplayMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, systemAudio: 'include', windowAudio: 'system' }),
    );
    await cap.dispose();
  });
});
