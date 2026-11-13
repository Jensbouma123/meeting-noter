import { loadSessionTranscript } from '../meeting/persist';
import { isCaptureActive } from '../meeting/store';
import { SemanticIndex } from './index';
import {
  listIndexedMeetingIds,
  loadIndex,
  saveIndex,
  type KeyValueStore,
} from './store';
import { createWorkerEmbedder, type WorkerEmbedder } from './worker-embedder';
import type { Chapter, Embedder, Hit, TranscriptLine } from './types';

/** Seams for tests; production uses the defaults. */
export interface SearchDeps {
  embedder?: Embedder;
  store?: KeyValueStore | null;
  loadLines?: (meetingId: string) => TranscriptLine[] | null;
  captureActive?: () => boolean;
}

let sharedEmbedder: WorkerEmbedder | null = null;

/** One worker-backed embedder per page; the worker and model start on first use. */
function defaultEmbedder(): Embedder {
  return (sharedEmbedder ??= createWorkerEmbedder());
}

/**
 * Stops the shared EmbeddingGemma 2 worker (~175 MB model) so it is never
 * resident beside ASR, diarization or D1. A later search or index spawns a
 * fresh one; in-flight embeds on it reject.
 */
export function disposeSharedEmbedder(): void {
  sharedEmbedder?.terminate();
  sharedEmbedder = null;
}

function defaultLoadLines(meetingId: string): TranscriptLine[] | null {
  const session = loadSessionTranscript(meetingId);
  if (!session) return null;
  return session.segments
    .filter((s) => s.final && s.text.trim() !== '')
    .map((s) => ({ start: s.start, end: s.end, text: s.text }));
}

/**
 * Embeds a finished meeting's stored transcript and persists windows, vectors
 * and chapters. Call it once capture has stopped; it refuses (returns null)
 * while any capture is active, so embedding never competes with live ASR.
 * Returns the chapters, or null when skipped, empty or not persisted.
 */
export async function indexMeeting(
  meetingId: string,
  deps: SearchDeps = {},
): Promise<Chapter[] | null> {
  if ((deps.captureActive ?? isCaptureActive)()) return null;
  const lines = (deps.loadLines ?? defaultLoadLines)(meetingId);
  if (!lines || lines.length === 0) return null;

  const index = new SemanticIndex(deps.embedder ?? defaultEmbedder());
  try {
    await index.addMeeting(meetingId, lines);
  } finally {
    // Indexing is a one-shot post-stop job: free the model right away.
    if (!deps.embedder) disposeSharedEmbedder();
  }
  const stored = index.exportMeeting(meetingId);
  if (!stored || stored.windows.length === 0) return null;
  const chapters = index.chapters(meetingId);
  const ok =
    deps.store === undefined
      ? saveIndex(meetingId, { ...stored, chapters })
      : saveIndex(meetingId, { ...stored, chapters }, deps.store);
  return ok ? chapters : null;
}

/** Top-k windows across every persisted meeting index. */
export async function searchMeetings(
  query: string,
  k = 5,
  deps: SearchDeps = {},
): Promise<Hit[]> {
  if (query.trim() === '') return [];
  const store = deps.store === undefined ? undefined : deps.store;
  const ids = store === undefined ? listIndexedMeetingIds() : listIndexedMeetingIds(store);
  const index = new SemanticIndex(deps.embedder ?? defaultEmbedder());
  for (const id of ids) {
    const saved = store === undefined ? loadIndex(id) : loadIndex(id, store);
    if (saved) index.restoreMeeting(id, saved.windows, saved.vectors);
  }
  if (index.size === 0) return [];
  return index.search(query, k);
}
