import { vi } from 'vitest';
import { FakeAudioWorkletNode } from './fake-audio-worklet-node.testUtils';

export const MIC = 0;
export const SYSTEM = 1;

export function fakeTrack() {
  return {
    kind: 'audio',
    stop: vi.fn(),
    onended: null,
    getConstraints: () => ({ echoCancellation: true, noiseSuppression: true }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
}

export function fakeStream(track = fakeTrack(), video = false) {
  const tracks: unknown[] = [track];
  if (video) tracks.push({ kind: 'video', stop: vi.fn() });
  return {
    track,
    stream: {
      getTracks: () => tracks,
      getAudioTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'audio'),
      getVideoTracks: () => tracks.filter((t) => (t as { kind: string }).kind === 'video'),
      removeTrack: (t: unknown) => tracks.splice(tracks.indexOf(t), 1),
    } as unknown as MediaStream,
  };
}

export class FakeAudioContext {
  state = 'running';
  sampleRate = 48000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

export const handler = { onFrame: vi.fn(), onLevel: vi.fn(), onSourceEnded: vi.fn(), onCallAudioSilent: vi.fn() };

export const flush = () => new Promise((r) => setTimeout(r, 0));

export function postFrames(nth: number, count: number, rms: number): void {
  const node = FakeAudioWorkletNode.instances[nth];
  for (let i = 0; i < count; i += 1) {
    node.port.onmessage?.({ data: { type: 'frame', pcm: new ArrayBuffer(3200), rms } } as MessageEvent);
  }
}

export function installCaptureEnv() {
  FakeAudioWorkletNode.instances.length = 0;
  handler.onCallAudioSilent.mockClear();
  const mic = fakeStream();
  const getDisplayMedia = vi.fn().mockResolvedValue(fakeStream(fakeTrack(), true).stream);
  const getUserMedia = vi.fn().mockResolvedValue(mic.stream);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, getDisplayMedia } });
  vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
  return { mic, getUserMedia, getDisplayMedia };
}
