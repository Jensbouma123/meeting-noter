import { findChapters } from './chapters';
import { chunkTranscript } from './chunk';
import { topHits } from './top-hits';
import type { Chapter, ChapterOpts, ChunkOpts, Embedder, Hit, MeetingEntry, TranscriptLine, Window } from './types';
import { normalizedCopy } from './vector-math';

const EMBED_BATCH = 16;

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

  async addMeeting(meetingId: string, lines: TranscriptLine[], opts?: ChunkOpts): Promise<Window[]> {
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

  restoreMeeting(meetingId: string, windows: Window[], vectors: Float32Array[]): void {
    if (windows.length !== vectors.length) {
      throw new RangeError('windows and vectors must have the same length');
    }
    this.meetings.set(meetingId, { windows, vectors: vectors.map(normalizedCopy) });
  }

  exportMeeting(meetingId: string): { windows: Window[]; vectors: Float32Array[] } | null {
    const entry = this.meetings.get(meetingId);
    return entry ? { windows: entry.windows, vectors: entry.vectors } : null;
  }

  removeMeeting(meetingId: string): boolean {
    return this.meetings.delete(meetingId);
  }

  async search(query: string, k = 5): Promise<Hit[]> {
    const [q] = await this.embedder.embed([query], 'query');
    if (!q) return [];
    return this.searchVector(normalizedCopy(q), k);
  }

  searchVector(query: Float32Array, k = 5): Hit[] {
    if (k <= 0) return [];
    return topHits(this.meetings, normalizedCopy(query), k);
  }

  chapters(meetingId: string, opts?: ChapterOpts): Chapter[] {
    const entry = this.meetings.get(meetingId);
    if (!entry) return [];
    return findChapters(meetingId, entry.windows, entry.vectors, opts);
  }
}
