import { centroidLoader, centroidsByFolder } from './compute';
import { suggestFolder } from './suggest';
import type { FolderSuggestion } from './types/folder-suggestion';
import type { SuggestionInput } from './types/suggestion-input';

export function suggestFolderOnDemand(
  meetingId: string,
  meetingFolders: Record<string, string | null>,
  loadVectors: SuggestionInput['loadVectors'],
  contextVectors: Record<string, Float32Array> = {},
  loadCentroid?: SuggestionInput['loadCentroid'],
): FolderSuggestion | null {
  const centroidOf = centroidLoader(loadVectors, loadCentroid);
  const centroids = centroidsByFolder(meetingFolders, centroidOf, contextVectors);
  const current = meetingFolders[meetingId];
  return suggestFolder(centroidOf(meetingId), centroids, current ? [current] : []);
}
