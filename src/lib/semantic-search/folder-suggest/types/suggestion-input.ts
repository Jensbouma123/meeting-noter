export interface SuggestionInput {
  sessionIds: readonly string[];
  meetingFolders: Record<string, string | null>;
  declined: Record<string, string[]>;
  contextVectors?: Record<string, Float32Array>;
  loadVectors: (meetingId: string) => Float32Array[] | null;
}
