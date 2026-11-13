import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { fakeStream, fakeTrack, handler, installCaptureEnv } from './capture.testUtils';

let mic: ReturnType<typeof fakeStream>;
let getUserMedia: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ mic, getUserMedia, getDisplayMedia } = installCaptureEnv());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mic echo cancellation', () => {
  it('is requested off up front for a mic-only recording — one getUserMedia call, no reconfiguration after', async () => {
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: false, noiseSuppression: true }) }),
    );
    expect(mic.track.applyConstraints).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('is requested off when call audio could not be shared (declined picker), never reconfigured', async () => {
    getDisplayMedia.mockRejectedValue(new Error('NotAllowedError'));
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic']);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: false }) }),
    );
    expect(mic.track.applyConstraints).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('is requested on when call audio is its own source', async () => {
    const cap = new Capture(handler);
    await cap.start('both');
    expect(cap.activeSources).toEqual(['mic', 'system']);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ echoCancellation: true }) }),
    );
    expect(mic.track.applyConstraints).not.toHaveBeenCalled();
    await cap.dispose();
  });

  it('is decided by the share, so the mic is requested only once the share settles', async () => {
    let resolveShare!: (s: MediaStream) => void;
    getDisplayMedia.mockReturnValueOnce(new Promise<MediaStream>((r) => (resolveShare = r)));
    const cap = new Capture(handler);
    const started = cap.start('both');
    await new Promise((r) => setTimeout(r, 0));
    expect(getDisplayMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
    resolveShare(fakeStream(fakeTrack(), true).stream);
    await started;
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await cap.dispose();
  });
});

describe('one microphone permission request per session', () => {
  it.each(['mic', 'both'] as const)('calls getUserMedia exactly once for mode %s', async (mode) => {
    const cap = new Capture(handler);
    await cap.start(mode);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
    await cap.dispose();
  });

  it('still calls getUserMedia exactly once when call audio fails to attach in "both" mode', async () => {
    getDisplayMedia.mockRejectedValue(new Error('NotAllowedError'));
    const cap = new Capture(handler);
    await cap.start('both');
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await cap.dispose();
  });
});
