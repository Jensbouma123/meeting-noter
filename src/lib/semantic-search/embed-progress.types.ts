export type EmbedProgressEvent =
  | { kind: 'progress'; file: string; loaded: number; total: number }
  | { kind: 'ready' }
  | { kind: 'failed'; message: string };

export type EmbedProgressListener = (event: EmbedProgressEvent) => void;

export interface EmbedWorkerProgress {
  progress: { file: string; loaded: number; total: number };
}
