import type { StatusBadgeTable } from './types';

export const SPEECH_STATUS_BADGE: StatusBadgeTable = {
  'not-downloaded': null,
  downloading: { label: 'badge.downloading', variant: 'primary' },
  cached: { label: 'badge.cached', variant: 'success' },
  failed: { label: 'badge.failed', variant: 'danger' },
  cancelled: { label: 'badge.cancelled', variant: 'warning' },
  unavailable: { label: 'badge.unavailable', variant: 'neutral' },
};
