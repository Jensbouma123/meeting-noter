import { loadSessionTranscript } from '../meeting/session-transcript-storage';
import { isCaptureActive } from '../meeting/transcript-session';
import type { CachedIndex } from './cached-index.types';
import { SemanticIndex } from './index';
import { indexSignature, listIndexedMeetingIds, loadIndex, saveIndex } from './store';
import { createWorkerEmbedder } from './worker-embedder';
import type { Chapter, Embedder, Hit, KeyValueStore, SearchDeps, TranscriptLine, WorkerEmbedder } from './types';

let sharedEmbedder: WorkerEmbedder | null = null;
let embedderUsers = 0;

function defaultEmbedder(): Embedder {
  return (sharedEmbedder ??= createWorkerEmbedder());
}

export function getSharedEmbedder(): Embedder {
  return defaultEmbedder();
}

export async function withEmbedder<T>(run: (embedder: Embedder) => Promise<T>): Promise<T> {
  embedderUsers++;
  try {
    return await run(defaultEmbedder());
  } finally {
    embedderUsers--;
    if (embedderUsers === 0) disposeSharedEmbedder();
  }
}

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

export async function indexMeeting(
  meetingId: string,
  deps: SearchDeps = {},
): Promise<Chapter[] | null> {
  if ((deps.captureActive ?? isCaptureActive)()) return null;
  const lines = (deps.loadLines ?? defaultLoadLines)(meetingId);
  if (!lines || lines.length === 0) return null;

  const embed = (embedder: Embedder) => {
    const fresh = new SemanticIndex(embedder);
    return fresh.addMeeting(meetingId, lines).then(() => fresh);
  };
  const index = deps.embedder ? await embed(deps.embedder) : await withEmbedder(embed);
  const stored = index.exportMeeting(meetingId);
  if (!stored || stored.windows.length === 0) return null;
  const chapters = index.chapters(meetingId);
  const ok =
    deps.store === undefined
      ? saveIndex(meetingId, { ...stored, chapters })
      : saveIndex(meetingId, { ...stored, chapters }, deps.store);
  if (ok) resetSearchCache();
  return ok ? chapters : null;
}

let cached: CachedIndex | null = null;

export function resetSearchCache(): void {
  cached = null;
}

function libraryIndex(embedder: Embedder, store: KeyValueStore | null | undefined): SemanticIndex {
  const ids = store === undefined ? listIndexedMeetingIds() : listIndexedMeetingIds(store);
  const signature = indexSignature(ids, store);
  if (cached && cached.signature === signature && cached.embedder === embedder && cached.store === store) {
    return cached.index;
  }
  const index = new SemanticIndex(embedder);
  for (const id of ids) {
    const saved = store === undefined ? loadIndex(id) : loadIndex(id, store);
    if (saved) index.restoreMeeting(id, saved.windows, saved.vectors);
  }
  cached = { signature, embedder, store, index };
  return index;
}

export async function searchMeetings(
  query: string,
  k = 5,
  deps: SearchDeps = {},
): Promise<Hit[]> {
  if (query.trim() === '') return [];
  const index = libraryIndex(deps.embedder ?? defaultEmbedder(), deps.store);
  if (index.size === 0) return [];
  return index.search(query, k);
}
