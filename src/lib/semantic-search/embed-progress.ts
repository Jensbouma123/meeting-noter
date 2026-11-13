import type { EmbedProgressEvent, EmbedProgressListener } from './embed-progress.types';

const listeners = new Set<EmbedProgressListener>();
let loading = false;

export function subscribeEmbedProgress(listener: EmbedProgressListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: EmbedProgressEvent): void {
  for (const listener of listeners) listener(event);
}

export function reportEmbedProgress(file: string, loaded: number, total: number): void {
  loading = true;
  emit({ kind: 'progress', file, loaded, total });
}

export function reportEmbedReady(): void {
  if (!loading) return;
  loading = false;
  emit({ kind: 'ready' });
}

export function reportEmbedFailed(message: string): void {
  if (!loading) return;
  loading = false;
  emit({ kind: 'failed', message });
}

export function toWorkerProgress(info: unknown): { file: string; loaded: number; total: number } | null {
  const p = info as { status?: string; file?: string; loaded?: number; total?: number } | null;
  if (!p || p.status !== 'progress' || typeof p.file !== 'string') return null;
  if (typeof p.loaded !== 'number' || typeof p.total !== 'number') return null;
  return { file: p.file, loaded: p.loaded, total: p.total };
}
