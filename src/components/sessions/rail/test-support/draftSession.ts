import type { SessionMetadata } from '@/lib/meeting/session-store';

export const draft = (overrides: Partial<SessionMetadata> = {}): SessionMetadata => ({
  sessionId: 'sess-1',
  title: 'Standup',
  segmentCount: 0,
  durationSeconds: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDraft: true,
  ...overrides,
});

export const recorded = (overrides: Partial<SessionMetadata> = {}) =>
  draft({ isDraft: false, segmentCount: 2, durationSeconds: 65, ...overrides });
