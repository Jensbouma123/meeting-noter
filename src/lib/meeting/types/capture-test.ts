import type { Mock } from 'vitest';

export interface FakeTrack {
  kind: 'audio' | 'video';
  stop: Mock;
  onended: (() => void) | null;
  getConstraints: () => MediaTrackConstraints;
  applyConstraints: Mock;
}

export interface FakeWindow extends EventTarget {
  AudioContext?: new () => unknown;
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export interface FakeBrowser {
  vendor: string;
  userAgent: string;
}
