import { centroidSimilarity, meanVector } from './centroid';
import { MIN_COSINE, MIN_FOLDER_MEETINGS, MIN_MARGIN } from './thresholds';
import type { FolderSuggestion } from './types/folder-suggestion';

export function folderCentroids(meetingCentroidsByFolder: Map<string, Float32Array[]>): Map<string, Float32Array> {
  const out = new Map<string, Float32Array>();
  for (const [folderId, centroids] of meetingCentroidsByFolder) {
    if (centroids.length < MIN_FOLDER_MEETINGS) continue;
    const mean = meanVector(centroids);
    if (mean) out.set(folderId, mean);
  }
  return out;
}

export function suggestFolder(
  centroid: Float32Array | null,
  centroids: Map<string, Float32Array>,
  declined: readonly string[],
): FolderSuggestion | null {
  if (!centroid) return null;
  const ranked = [...centroids]
    .filter(([id]) => !declined.includes(id))
    .map(([folderId, c]) => ({ folderId, score: centroidSimilarity(centroid, c) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < MIN_COSINE) return null;
  if (ranked.length > 1 && best.score - ranked[1].score < MIN_MARGIN) return null;
  return best;
}
