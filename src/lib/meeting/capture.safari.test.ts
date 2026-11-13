import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capture } from './capture';
import { SAFARI_MIC_NEEDS_HELPER } from './capture-constants';
import { handler, installCaptureEnv } from './capture.testUtils';

let getUserMedia: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ getUserMedia, getDisplayMedia } = installCaptureEnv());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Safari: no getDisplayMedia audio support', () => {
  function stubSafari(): void {
    vi.stubGlobal('navigator', {
      vendor: 'Apple Computer, Inc.',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
      mediaDevices: { getUserMedia, getDisplayMedia },
    });
  }

  it('does not open a share prompt or microphone in Safari when the helper is unavailable', async () => {
    stubSafari();
    const cap = new Capture(handler);
    await expect(cap.start('both')).rejects.toThrow(/system audio helper/);
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(cap.activeSources).toEqual([]);
    expect(cap.diagnostics().callAudioUnsupported).toBe(true);
    expect(cap.diagnostics().shareError).toMatch(/Safari does not share call audio/);
    await cap.dispose();
  });

  it('asks the system audio helper in system mode, not a share, and throws when the helper does not answer', async () => {
    stubSafari();
    const cap = new Capture(handler);
    await expect(cap.start('system')).rejects.toThrow(/Safari does not share call audio.*system audio helper/);
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });

  it('fails Safari mic-only capture without a helper, never opening a microphone stream', async () => {
    stubSafari();
    const cap = new Capture(handler);
    await expect(cap.start('mic')).rejects.toThrow(SAFARI_MIC_NEEDS_HELPER);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });
});
