import { afterEach, beforeEach, vi } from 'vitest';
import { FakeHelperSocket } from './helper-test-socket';
import { resetHelperReachability } from './helper-connection';
import type { FakeBrowser } from './types/capture-test';

function fakeStream(video = false) {
  const track = { kind: 'audio', stop: vi.fn(), onended: null, applyConstraints: vi.fn().mockResolvedValue(undefined) };
  const tracks: unknown[] = [track];
  if (video) tracks.push({ kind: 'video', stop: vi.fn() });
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'video'),
    removeTrack: (t: unknown) => tracks.splice(tracks.indexOf(t), 1),
  } as unknown as MediaStream;
}

class FakeAudioContext {
  state = 'running';
  sampleRate = 48000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

class FakeAudioWorkletNode {
  port = { onmessage: null, close: vi.fn() };
  disconnect = vi.fn();
}

export const SAFARI: FakeBrowser = {
  vendor: 'Apple Computer, Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15',
};
export const CHROME: FakeBrowser = {
  vendor: 'Google Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
};

export const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn(), onCallAudioSilent: vi.fn() };
export const env = {} as { getUserMedia: ReturnType<typeof vi.fn>; getDisplayMedia: ReturnType<typeof vi.fn> };

export function stubBrowser(ua: FakeBrowser): void {
  vi.stubGlobal('navigator', {
    ...ua,
    mediaDevices: { getUserMedia: env.getUserMedia, getDisplayMedia: env.getDisplayMedia },
  });
}

export function socket(): FakeHelperSocket {
  const ws = FakeHelperSocket.instances.at(-1);
  if (!ws) throw new Error('no helper socket opened');
  return ws;
}

export function registerHelperEnv(): void {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeHelperSocket.reset();
    resetHelperReachability();
    env.getUserMedia = vi.fn().mockImplementation(async () => fakeStream());
    env.getDisplayMedia = vi.fn().mockImplementation(async () => fakeStream(true));
    vi.stubGlobal('window', { AudioContext: FakeAudioContext, WebSocket: FakeHelperSocket });
    vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
