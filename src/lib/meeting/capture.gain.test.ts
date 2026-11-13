import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SILENT_SHARE_FRAMES } from './capture-constants';
import { fakeStream, flush, handler, installCaptureEnv, postFrames, SYSTEM } from './capture.testUtils';

let mic: ReturnType<typeof fakeStream>;
let getUserMedia: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ mic, getUserMedia, getDisplayMedia } = installCaptureEnv());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mic gain stays put in "both" mode', () => {
  const audioOf = (call: unknown[]) => (call[0] as { audio: MediaTrackConstraints }).audio;

  it('pins gain control off on the mic, with the share attached or not', async () => {
    const cap = new Capture(handler);
    await cap.start('both', 'usb-mic');
    expect(audioOf(getUserMedia.mock.calls[0])).toEqual({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      deviceId: { ideal: 'usb-mic' },
    });
    await cap.dispose();

    getUserMedia.mockClear();
    getDisplayMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    const declined = new Capture(handler);
    await declined.start('both');
    expect(audioOf(getUserMedia.mock.calls[0])).toEqual({
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
    });
    await declined.dispose();
  });

  it('reopens the mic for a silent share with only echo cancellation changed', async () => {
    getUserMedia.mockResolvedValueOnce(mic.stream).mockResolvedValueOnce(fakeStream().stream);
    const cap = new Capture(handler);
    await cap.start('both', 'usb-mic');
    postFrames(SYSTEM, SILENT_SHARE_FRAMES, 0);
    await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    const [first, second] = getUserMedia.mock.calls.map(audioOf);
    expect(second).toEqual({ ...first, echoCancellation: false });
    expect(second.autoGainControl).toBe(false);
    expect(cap.diagnostics().micReopens).toBe(1);
    await cap.dispose();
  });

  it('leaves the mic-only request as it was', async () => {
    const cap = new Capture(handler);
    await cap.start('mic');
    expect(audioOf(getUserMedia.mock.calls[0])).toEqual({ echoCancellation: false, noiseSuppression: true });
    await cap.dispose();
  });
});
