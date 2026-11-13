import { vi } from 'vitest';

export function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

class FakeAudioContext {
  state = 'running';
  sampleRate = 16000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

class FakeAudioWorkletNode {
  port = { onmessage: null, close: vi.fn() };
  disconnect = vi.fn();
}
export function installBrowser(storage: Storage): void {
  const track = { kind: 'audio', stop: vi.fn(), onended: null };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
  });
  vi.stubGlobal('window', { AudioContext: FakeAudioContext, localStorage: storage });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
}
