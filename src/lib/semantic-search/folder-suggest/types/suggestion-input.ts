export interface SuggestionInput {
  sessionIds: readonly string[];
  meetingFolders: Record<string, string | null>;
  declined: Record<string, string[]>;
  loadVectors: (meetingId: string) => Float32Array[] | null;
}
