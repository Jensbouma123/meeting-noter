/** Dimension of the EmbeddingGemma 2 text space. */
export const EMBEDDING_DIM = 768;

/**
 * Turns text into unit-length-or-zero vectors. `role` selects the task prefix
 * EmbeddingGemma expects for queries vs. stored documents; embedders that do
 * not care ignore it.
 *
 * TODO(eg2-loader): the EmbeddingGemma 2 adapter (over src/lib/embeddinggemma2/)
 * is not written: exchange/eg2-loader.md did not exist when this was built.
 * Only `createFakeEmbedder` implements this interface so far.
 */
export interface Embedder {
  readonly dim: number;
  embed(texts: string[], role?: 'query' | 'document'): Promise<Float32Array[]>;
}

/** A stored transcript line, on the meeting clock (seconds). */
export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
}

/** A time window of one meeting's transcript; the unit that gets embedded. */
export interface Window {
  meetingId: string;
  /** Position among the meeting's emitted windows, from 0. */
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface Hit {
  meetingId: string;
  window: Window;
  /** Cosine similarity to the query, in [-1, 1]. */
  score: number;
}

/** A topic chapter: a run of adjacent windows with one shared topic. */
export interface Chapter {
  meetingId: string;
  index: number;
  start: number;
  end: number;
  /** Windows covered, as `[windowStart, windowEnd)` positions. */
  windowStart: number;
  windowEnd: number;
  /** The chapter's top terms, joined; `Chapter N` when it has none. */
  title: string;
  terms: string[];
}
