import type { TurnSpan, TurnTrackerOptions } from './turns';

export interface RescoreWindow {
  channel: number;
  start: number;
  end: number;
}

export interface SpillRun {
  channel: number;
  startFrame: number;
  endFrame: number;
  offset: number;
  length: number;
}

export interface SpillBackend {
  readonly kind: 'opfs' | 'indexeddb';
  write(offset: number, data: Int16Array): Promise<void>;
  read(offset: number, length: number): Promise<Int16Array>;
  truncate(length: number): Promise<void>;
  remove(): Promise<void>;
}

export interface SyncAccessHandleLike {
  write(buffer: ArrayBufferView, options: { at: number }): number;
  read(buffer: ArrayBufferView, options: { at: number }): number;
  truncate(size: number): void;
  flush(): void;
  close(): void;
}

export interface OpfsFileLike {
  createSyncAccessHandle?: () => Promise<SyncAccessHandleLike>;
}

export interface OpfsDirectoryLike {
  getFileHandle(name: string, options: { create: boolean }): Promise<OpfsFileLike>;
  removeEntry(name: string): Promise<void>;
}

export interface SpillEnvironment {
  getDirectory?: () => Promise<OpfsDirectoryLike>;
  indexedDB?: IDBFactory;
}

export interface SpillChunk {
  spill: string;
  offset: number;
  data: Int16Array;
}

export interface SpillReader {
  readonly runs: readonly SpillRun[];
  readWindow(window: RescoreWindow): Promise<Int16Array>;
}

export interface SpeakerEmbedderLike {
  embed(feats: Float32Array[], frames: number[]): Promise<Float32Array>;
}

export type RescoreTurnOptions = Omit<TurnTrackerOptions, 'numSpeakers' | 'frameSec' | 'provisional'>;

export interface RescoreInput {
  probs: Float32Array;
  numChannels: number;
  spill: SpillReader;
  embedder: SpeakerEmbedderLike;
  frameSec: number;
  turnOptions?: RescoreTurnOptions;
}

export interface RescoreResult {
  turns: TurnSpan[];
  numSpeakers: number;
  labelToChannel: Int32Array;
  windows: number;
}
