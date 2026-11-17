import { findChapters } from './chapters';
import { chunkTranscript } from './chunk';
import { embedWindows } from './index-record';
import { topHits } from './top-hits';
import type { Chapter, ChapterOpts, ChunkOpts, Embedder, Hit, MeetingEntry, TranscriptLine, Window } from './types';
import { normalizedCopy } from './vector-math';

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
    const vectors = await embedWindows(this.embedder, windows);
    this.meetings.set(meetingId, { windows, vectors });
    return windows;
  }

  restoreMeeting(meetingId: string, windows: Window[], vectors: Float32Array[]): void {
    if (windows.length !== vectors.length) {
      throw new RangeError('windows and vectors must have the same length');
    }
    this.meetings.set(meetingId, { windows, vectors });
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
