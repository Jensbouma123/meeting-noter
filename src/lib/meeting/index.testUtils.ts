import { vi } from 'vitest';

interface FakeTrack {
  kind: 'audio' | 'video';
  stop: () => void;
  onended: (() => void) | null;
}

function fakeTrack(kind: 'audio' | 'video'): FakeTrack {
  return { kind, stop: vi.fn(), onended: null };
}

function fakeStream(opts: { audio?: boolean; video?: boolean } = { audio: true }): MediaStream {
  const tracks: FakeTrack[] = [];
  if (opts.audio !== false) tracks.push(fakeTrack('audio'));
  if (opts.video) tracks.push(fakeTrack('video'));
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    removeTrack: (track: unknown) => {
      const idx = tracks.indexOf(track as FakeTrack);
      if (idx >= 0) tracks.splice(idx, 1);
    },
  } as unknown as MediaStream;
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  sampleRate = 16000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
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

export let getUserMediaMock: ReturnType<typeof vi.fn>;
export let getDisplayMediaMock: ReturnType<typeof vi.fn>;

export function installBrowserStubs(): void {
  getUserMediaMock = vi.fn().mockResolvedValue(fakeStream({ audio: true }));
  getDisplayMediaMock = vi.fn().mockResolvedValue(fakeStream({ audio: true, video: true }));

  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: getUserMediaMock,
      getDisplayMedia: getDisplayMediaMock,
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
  });
  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
}

export function uninstallBrowserStubs(): void {
  vi.unstubAllGlobals();
}

export function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

export const tick = () => new Promise((r) => setTimeout(r, 0));

export function sendFrame(node: FakeAudioWorkletNode): void {
  node.port.onmessage?.({
    data: { type: 'frame', rms: 0.2, pcm: new Int16Array(1600).buffer },
  } as unknown as MessageEvent);
}
