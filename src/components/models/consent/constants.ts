import type { ConsentBadgeTable } from './types';

export const CONSENT_STATUS_BADGE: ConsentBadgeTable = {
  'not-downloaded': null,
  downloading: { label: 'Downloading', variant: 'primary' },
  cached: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'warning' },
  unavailable: { label: 'Not supported', variant: 'neutral' },
};
