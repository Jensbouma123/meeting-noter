import type { SuggestionInput } from './types/suggestion-input';
import { meetingCentroid } from './centroid';
import { folderCentroids, suggestFolder } from './suggest';
import type { FolderSuggestion } from './types/folder-suggestion';

export function computeFolderSuggestions(input: SuggestionInput): Record<string, FolderSuggestion> {
  const { sessionIds, meetingFolders, declined, loadVectors } = input;
  const cache = new Map<string, Float32Array | null>();
  const centroidOf = (id: string) => {
    if (!cache.has(id)) {
      const vectors = loadVectors(id);
      cache.set(id, vectors ? meetingCentroid(vectors) : null);
    }
    return cache.get(id) ?? null;
  };
  const byFolder = new Map<string, Float32Array[]>();
  for (const [meetingId, folderId] of Object.entries(meetingFolders)) {
    const c = folderId ? centroidOf(meetingId) : null;
    if (folderId && c) byFolder.set(folderId, [...(byFolder.get(folderId) ?? []), c]);
  }
  const centroids = folderCentroids(byFolder);
  const out: Record<string, FolderSuggestion> = {};
  if (centroids.size === 0) return out;
  for (const id of sessionIds) {
    if (meetingFolders[id]) continue;
    const found = suggestFolder(centroidOf(id), centroids, declined[id] ?? []);
    if (found) out[id] = found;
  }
  return out;
}
