export const EMBEDDING_DIM = 768;

export interface Embedder {
  readonly dim: number;
  embed(texts: string[], role?: 'query' | 'document'): Promise<Float32Array[]>;
}

export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
}

export interface Window {
  meetingId: string;
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface Hit {
  meetingId: string;
  window: Window;
  score: number;
}

export interface Chapter {
  meetingId: string;
  index: number;
  start: number;
  end: number;
  windowStart: number;
  windowEnd: number;
  title: string;
  terms: string[];
}

export interface ChunkOpts {
  windowSeconds?: number;
  strideSeconds?: number;
}

export interface ChapterOpts {
  minChapterWindows?: number;
  sensitivity?: number;
  blockWindows?: number;
  termsPerTitle?: number;
}

export interface MeetingEntry {
  windows: Window[];
  vectors: Float32Array[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedIndex {
  windows: Window[];
  vectors: Float32Array[];
  chapters: Chapter[];
  indexedAt: number;
}

export interface SearchDeps {
  embedder?: Embedder;
  store?: KeyValueStore | null;
  loadLines?: (meetingId: string) => TranscriptLine[] | null;
  captureActive?: () => boolean;
}

export interface EmbedWorkerIn {
  id: number;
  texts: string[];
  role: 'query' | 'document';
}

export type EmbedWorkerOut = { id: number; vectors: Float32Array[] } | { id: number; error: string };

export interface EmbedWorkerLike {
  postMessage(msg: EmbedWorkerIn): void;
  onmessage: ((e: { data: EmbedWorkerOut }) => void) | null;
  onerror: ((e: { message?: string }) => void) | null;
  terminate(): void;
}

export interface WorkerEmbedder extends Embedder {
  terminate(): void;
}
