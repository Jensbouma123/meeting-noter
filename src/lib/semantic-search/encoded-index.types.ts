import type { Chapter, Window } from './types';

export interface EncodedIndex {
  windows: Window[];
  vectors: string[];
  chapters: Chapter[];
  centroid: Float32Array | null;
}
