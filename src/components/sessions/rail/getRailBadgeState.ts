import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import type { RailBadgeState } from './types';

export function getRailBadgeState(session: SessionMetadata, recording: boolean): RailBadgeState {
  if (recording) return 'recording';
  if (session.isDraft) return 'draft';
  return 'none';
}
