import type { SearchDeps } from './types';

export interface BackfillProgress {
  total: number;
  done: number;
  failed: number;
  aborted: boolean;
}

export interface BackfillDeps extends SearchDeps {
  listMeetingIds?: () => string[];
  attempted?: Set<string>;
  signal?: { aborted: boolean };
  onProgress?: (progress: BackfillProgress) => void;
  pause?: () => Promise<void>;
}
