import { loadSessionTranscript } from '../meeting/session-transcript-storage';
import { isCaptureActive } from '../meeting/store';
import { SemanticIndex } from './index';
import { listIndexedMeetingIds, loadIndex, saveIndex } from './store';
import { createWorkerEmbedder } from './worker-embedder';
import type { Chapter, Embedder, Hit, SearchDeps, TranscriptLine, WorkerEmbedder } from './types';

let sharedEmbedder: WorkerEmbedder | null = null;

function defaultEmbedder(): Embedder {
  return (sharedEmbedder ??= createWorkerEmbedder());
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

  const index = new SemanticIndex(deps.embedder ?? defaultEmbedder());
  try {
    await index.addMeeting(meetingId, lines);
  } finally {
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
