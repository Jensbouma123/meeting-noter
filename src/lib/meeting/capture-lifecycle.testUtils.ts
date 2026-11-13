import { afterEach, beforeEach, expect, vi } from 'vitest';
import type { Deferred, FakeBrowser, FakeTrack, FakeWindow } from './types/capture-test';

export const tracks: FakeTrack[] = [];
export const contexts: FakeAudioContext[] = [];

function fakeTrack(kind: 'audio' | 'video'): FakeTrack {
  const track: FakeTrack = {
    kind,
    stop: vi.fn(),
    onended: null,
    getConstraints: () => ({ echoCancellation: true, noiseSuppression: true }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
  tracks.push(track);
  return track;
}

export function fakeStream(opts: { audio?: boolean; video?: boolean } = {}): MediaStream {
  const list: FakeTrack[] = [];
  if (opts.audio !== false) list.push(fakeTrack('audio'));
  if (opts.video) list.push(fakeTrack('video'));
  return {
    getTracks: () => [...list],
    getAudioTracks: () => list.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => list.filter((t) => t.kind === 'video'),
    removeTrack: (t: unknown) => {
      const i = list.indexOf(t as FakeTrack);
      if (i >= 0) list.splice(i, 1);
    },
  } as unknown as MediaStream;
}

export class FakeAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  sampleRate = 48000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  constructor() {
    contexts.push(this);
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

export class FakeAudioWorkletNode {
  static instances: FakeAudioWorkletNode[] = [];
  port: { onmessage: ((ev: MessageEvent) => void) | null; close: () => void } = {
    onmessage: null,
    close: vi.fn(),
  };
  disconnect = vi.fn();
  constructor() {
    FakeAudioWorkletNode.instances.push(this);
  }
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const CHROME: FakeBrowser = {
  vendor: 'Google Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};
export const SAFARI: FakeBrowser = {
  vendor: 'Apple Computer, Inc.',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
};

export const env = {} as {
  getUserMedia: ReturnType<typeof vi.fn>;
  getDisplayMedia: ReturnType<typeof vi.fn>;
  win: FakeWindow;
};

export function installBrowser(browser: FakeBrowser = CHROME): void {
  env.getUserMedia = vi.fn(async () => fakeStream({ audio: true }));
  env.getDisplayMedia = vi.fn(async () => fakeStream({ audio: true, video: true }));
  vi.stubGlobal('navigator', {
    ...browser,
    mediaDevices: {
      getUserMedia: env.getUserMedia,
      getDisplayMedia: env.getDisplayMedia,
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
  });
  env.win = Object.assign(new EventTarget(), { AudioContext: FakeAudioContext });
  vi.stubGlobal('window', env.win);
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
}

export function resetLifecycleFakes(): void {
  tracks.length = 0;
  contexts.length = 0;
  FakeAudioWorkletNode.instances.length = 0;
}

export function expectAllReleased(): void {
  expect(tracks.length).toBeGreaterThan(0);
  for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  for (const c of contexts) expect(c.close).toHaveBeenCalled();
}

export const flush = () => new Promise((r) => setTimeout(r, 0));

export function useLifecycleEnv(): void {
  beforeEach(() => {
    resetLifecycleFakes();
    installBrowser();
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
