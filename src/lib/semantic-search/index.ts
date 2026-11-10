import { chunkTranscript, type ChunkOpts } from './chunk';
import { findChapters, type ChapterOpts } from './chapters';
import type { Chapter, Embedder, Hit, TranscriptLine, Window } from './types';

export { chunkTranscript, type ChunkOpts } from './chunk';
export { findChapters, type ChapterOpts } from './chapters';
export { createFakeEmbedder } from './fake-embedder';
export { tokenize, normalizeText } from './text';
export {
  EMBEDDING_DIM,
  type Chapter,
  type Embedder,
  type Hit,
  type TranscriptLine,
  type Window,
} from './types';

interface MeetingEntry {
  windows: Window[];
  vectors: Float32Array[];
}

const EMBED_BATCH = 16;

function normalizedCopy(v: Float32Array): Float32Array {
  const out = new Float32Array(v);
  let norm = 0;
  for (let i = 0; i < out.length; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Cosine top-k search over finished meetings, plus chapters per meeting.
 *
 * Call `addMeeting` only once a meeting has stopped. Embedding is batch work
 * and must never run during live capture. This module imports nothing from
 * the ASR path.
 *
 * Memory is about `windows * dim * 4` bytes per meeting: roughly 0.4 MB per
 * hour at the 30 s default window.
 */
export class SemanticIndex {
  private readonly meetings = new Map<string, MeetingEntry>();

  constructor(private readonly embedder: Embedder) {}

  get size(): number {
    return this.meetings.size;
  }

  has(meetingId: string): boolean {
    return this.meetings.has(meetingId);
  }

  meetingIds(): string[] {
    return [...this.meetings.keys()];
  }

  /** Chunks, embeds and stores one finished meeting. Replaces any earlier copy. */
  async addMeeting(
    meetingId: string,
    lines: TranscriptLine[],
    opts?: ChunkOpts,
  ): Promise<Window[]> {
    const windows = chunkTranscript(meetingId, lines, opts);
    const vectors: Float32Array[] = [];
    for (let i = 0; i < windows.length; i += EMBED_BATCH) {
      const batch = windows.slice(i, i + EMBED_BATCH).map((w) => w.text);
      const embedded = await this.embedder.embed(batch, 'document');
      if (embedded.length !== batch.length) {
        throw new Error(`embedder returned ${embedded.length} vectors for ${batch.length} texts`);
      }
      for (const v of embedded) {
        if (v.length !== this.embedder.dim) {
          throw new Error(`embedder dim ${v.length}, expected ${this.embedder.dim}`);
        }
        vectors.push(normalizedCopy(v));
      }
    }
    this.meetings.set(meetingId, { windows, vectors });
    return windows;
  }

  /** Loads an already-embedded meeting (from persistence) without calling the embedder. */
  restoreMeeting(meetingId: string, windows: Window[], vectors: Float32Array[]): void {
    if (windows.length !== vectors.length) {
      throw new RangeError('windows and vectors must have the same length');
    }
    this.meetings.set(meetingId, { windows, vectors: vectors.map(normalizedCopy) });
  }

  /** The windows and vectors of one stored meeting, or null when it is not indexed. */
  exportMeeting(meetingId: string): { windows: Window[]; vectors: Float32Array[] } | null {
    const entry = this.meetings.get(meetingId);
    return entry ? { windows: entry.windows, vectors: entry.vectors } : null;
  }

  removeMeeting(meetingId: string): boolean {
    return this.meetings.delete(meetingId);
  }

  /** Top-k windows across all meetings for a text query. */
  async search(query: string, k = 5): Promise<Hit[]> {
    const [q] = await this.embedder.embed([query], 'query');
    if (!q) return [];
    return this.searchVector(normalizedCopy(q), k);
  }

  /** Top-k windows for a query vector that is already embedded. */
  searchVector(query: Float32Array, k = 5): Hit[] {
    if (k <= 0) return [];
    const qn = normalizedCopy(query);
    const best: Hit[] = [];
    for (const [meetingId, entry] of this.meetings) {
      entry.vectors.forEach((v, i) => {
        const score = dot(qn, v);
        if (best.length === k && score <= best[k - 1].score) return;
        const hit: Hit = { meetingId, window: entry.windows[i], score };
        let pos = best.length;
        while (pos > 0 && best[pos - 1].score < score) pos--;
        best.splice(pos, 0, hit);
        if (best.length > k) best.pop();
      });
    }
    return best;
  }

  /** Topic chapters of one stored meeting; empty if it is not indexed. */
  chapters(meetingId: string, opts?: ChapterOpts): Chapter[] {
    const entry = this.meetings.get(meetingId);
    if (!entry) return [];
    return findChapters(meetingId, entry.windows, entry.vectors, opts);
  }
}
