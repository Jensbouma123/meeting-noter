import { findChapters } from './chapters';
import { chunkTranscript } from './chunk';
import { encodeRecord } from './encode-record';
import type { EncodedIndex } from './encoded-index.types';
import type { ChunkOpts, Embedder, TranscriptLine, Window } from './types';
import { normalizedCopy } from './vector-math';

const EMBED_BATCH = 16;

export async function embedWindows(embedder: Embedder, windows: Window[]): Promise<Float32Array[]> {
  const vectors: Float32Array[] = [];
  for (let i = 0; i < windows.length; i += EMBED_BATCH) {
    const batch = windows.slice(i, i + EMBED_BATCH).map((w) => w.text);
    const embedded = await embedder.embed(batch, 'document');
    if (embedded.length !== batch.length) {
      throw new Error(`embedder returned ${embedded.length} vectors for ${batch.length} texts`);
    }
    for (const v of embedded) {
      if (v.length !== embedder.dim) {
        throw new Error(`embedder dim ${v.length}, expected ${embedder.dim}`);
      }
      vectors.push(normalizedCopy(v));
    }
  }
  return vectors;
}

export async function buildIndexRecord(
  meetingId: string,
  lines: TranscriptLine[],
  embedder: Embedder,
  opts?: ChunkOpts,
): Promise<EncodedIndex | null> {
  const windows = chunkTranscript(meetingId, lines, opts);
  if (windows.length === 0) return null;
  const vectors = await embedWindows(embedder, windows);
  return encodeRecord(windows, vectors, findChapters(meetingId, windows, vectors));
}
