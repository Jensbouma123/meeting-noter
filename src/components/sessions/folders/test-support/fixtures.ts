import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';

export const folder = (id: string, parentId: string | null, name: string): FolderRow => ({ id, parentId, name, sort: 0, createdAt: 0, updatedAt: 0 });
export const session = { sessionId: 'm1', title: 'Standup', segmentCount: 1, durationSeconds: 5, createdAt: 1, updatedAt: 1 } as SessionMetadata;
export const sessions = [session];
