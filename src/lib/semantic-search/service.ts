import { loadSessionTranscript } from '../meeting/session-transcript-storage';
import { isCaptureActive } from '../meeting/transcript-session';
import type { CachedIndex } from './cached-index.types';
import { SemanticIndex } from './index';
import { isSearchModelReady } from './model-gate';
import { buildIndexRecord } from './index-record';
import { currentIndexVersion, listIndexedMeetingIds, loadIndex, saveEncodedIndex } from './store';
import { decodeUnitVector } from './vector-codec';
import { createWorkerEmbedder } from './worker-embedder';
import type {
  Chapter,
  Embedder,
  Hit,
  KeyValueStore,
  MeetingIndexer,
  SearchDeps,
  TranscriptLine,
  WorkerEmbedder,
} from './types';

let sharedEmbedder: WorkerEmbedder | null = null;
let embedderUsers = 0;

function defaultEmbedder(): Embedder {
  return (sharedEmbedder ??= createWorkerEmbedder());
}

export function getSharedEmbedder(): Embedder {
  return defaultEmbedder();
}

export class SearchModelNotReadyError extends Error {
  constructor() {
    super('Search model is not downloaded');
  }
}

export async function withEmbedder<T>(run: (embedder: Embedder) => Promise<T>): Promise<T> {
  if (!isSearchModelReady()) throw new SearchModelNotReadyError();
  return withEmbedderForDownload(run);
}

export async function withEmbedderForDownload<T>(run: (embedder: Embedder) => Promise<T>): Promise<T> {
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

export async function indexMeeting(meetingId: string, deps: SearchDeps = {}): Promise<Chapter[] | null> {
  if ((deps.captureActive ?? isCaptureActive)()) return null;
  const lines = (deps.loadLines ?? defaultLoadLines)(meetingId);
  if (!lines || lines.length === 0) return null;

  const build = (embedder: Embedder) =>
    isMeetingIndexer(embedder) ? embedder.indexMeeting(meetingId, lines) : buildIndexRecord(meetingId, lines, embedder);
  const record = deps.embedder ? await build(deps.embedder) : await withEmbedder(build);
  if (!record || record.windows.length === 0) return null;
  const ok =
    deps.store === undefined ? saveEncodedIndex(meetingId, record) : saveEncodedIndex(meetingId, record, deps.store);
  return ok ? record.chapters : null;
}

function isMeetingIndexer(embedder: Embedder): embedder is Embedder & MeetingIndexer {
  return typeof (embedder as Partial<MeetingIndexer>).indexMeeting === 'function';
}

let cached: CachedIndex | null = null;

export function resetSearchCache(): void {
  cached = null;
}

function libraryIndex(embedder: Embedder, store: KeyValueStore | null | undefined): SemanticIndex {
  const version = currentIndexVersion();
  if (cached && cached.version === version && cached.embedder === embedder && cached.store === store) {
    return cached.index;
  }
  const ids = store === undefined ? listIndexedMeetingIds() : listIndexedMeetingIds(store);
  const index = new SemanticIndex(embedder);
  for (const id of ids) {
    const saved =
      store === undefined ? loadIndex(id, undefined, decodeUnitVector) : loadIndex(id, store, decodeUnitVector);
    if (saved) index.restoreMeeting(id, saved.windows, saved.vectors);
  }
  cached = { version, embedder, store, index };
  return index;
}

export async function searchMeetings(query: string, k = 5, deps: SearchDeps = {}): Promise<Hit[]> {
  if (query.trim() === '') return [];
  if (!deps.embedder && !isSearchModelReady()) return [];
  const index = libraryIndex(deps.embedder ?? defaultEmbedder(), deps.store);
  if (index.size === 0) return [];
  return index.search(query, k);
}
