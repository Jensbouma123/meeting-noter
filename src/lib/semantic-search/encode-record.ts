import type { EncodedIndex } from './encoded-index.types';
import { meetingCentroid } from './folder-suggest/centroid';
import type { Chapter, Window } from './types';
import { decodeVector, encodeVector } from './vector-codec';

export function encodeRecord(windows: Window[], vectors: Float32Array[], chapters: Chapter[]): EncodedIndex {
  const encoded = vectors.map(encodeVector);
  return { windows, vectors: encoded, chapters, centroid: meetingCentroid(encoded.map(decodeVector)) };
}
