import type { SuggestionInput } from './types/suggestion-input';
import { meetingCentroid } from './centroid';
import { folderCentroids, suggestFolder } from './suggest';
import type { FolderSuggestion } from './types/folder-suggestion';

export function centroidLoader(loadVectors: SuggestionInput['loadVectors']): (id: string) => Float32Array | null {
  const cache = new Map<string, Float32Array | null>();
  return (id) => {
    if (!cache.has(id)) {
      const vectors = loadVectors(id);
      cache.set(id, vectors ? meetingCentroid(vectors) : null);
    }
    return cache.get(id) ?? null;
  };
}

export function centroidsByFolder(
  meetingFolders: Record<string, string | null>,
  centroidOf: (id: string) => Float32Array | null,
): Map<string, Float32Array> {
  const byFolder = new Map<string, Float32Array[]>();
  for (const [meetingId, folderId] of Object.entries(meetingFolders)) {
    const c = folderId ? centroidOf(meetingId) : null;
    if (folderId && c) byFolder.set(folderId, [...(byFolder.get(folderId) ?? []), c]);
  }
  return folderCentroids(byFolder);
}

export function computeFolderSuggestions(input: SuggestionInput): Record<string, FolderSuggestion> {
  const { sessionIds, meetingFolders, declined, loadVectors } = input;
  const centroidOf = centroidLoader(loadVectors);
  const centroids = centroidsByFolder(meetingFolders, centroidOf);
  const out: Record<string, FolderSuggestion> = {};
  if (centroids.size === 0) return out;
  for (const id of sessionIds) {
    if (meetingFolders[id]) continue;
    const found = suggestFolder(centroidOf(id), centroids, declined[id] ?? []);
    if (found) out[id] = found;
  }
  return out;
}
