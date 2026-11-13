import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import type { BackfillProgress } from '@/lib/semantic-search/backfill.types';

export interface LibrarySearchProps {
  sessions: SessionMetadata[];
  progress: BackfillProgress | null;
}
