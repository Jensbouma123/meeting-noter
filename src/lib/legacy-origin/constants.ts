export const EXPORT_PATH = '/legacy-export';
export const STATUS_PATH = '/api/app/status';
export const API_PATH = '/api/app/legacy-origin';

export const REQUEST_TYPE = 'mn-legacy-request';
export const EXPORT_TYPE = 'mn-legacy-export';
export const PROTOCOL_VERSION = 1;

export const LIMITS = {
  maxEntries: 5_000,
  maxValueChars: 5_000_000,
  maxTotalChars: 10_000_000,
  maxKeyChars: 200,
} as const;

export const IMPORT_TIMEOUT_MS = 15_000;
export const LISTEN_WINDOW_MS = 10 * 60_000;

export const PENDING_MARKER = 'legacy-origin.pending';
export const DONE_MARKER = 'legacy-origin.done';

export const SESSIONS_INDEX_KEY = 'mn.sessions.v1';

export const MIGRATABLE_KEYS: readonly string[] = [
  'mn.settings',
  'mn.settings.section',
  'mn.title',
  'mn.vocabulary',
  'mn-theme-preference',
  'mn.onboarding.done',
  'mn.onboarding.assistant.seen',
  'mn.model-consent.v1',
  'mn.update.dismissed',
  'whatsNewLastSeen',
  'mn.sessionRailOpen',
  'mn.speakerRailOpen',
  SESSIONS_INDEX_KEY,
  'mn.autosave.v1',
  'mn.sync.pending.v1',
  'mn.sync.synced.v1',
  'mn.db-migrated.v1',
  'mn.participants.recent.v1',
  'meeting-noter:asr-model-family',
];

export const MIGRATABLE_PATTERNS: readonly string[] = [
  '^mn\\.session\\.[A-Za-z0-9_-]{1,128}\\.v1$',
  '^mn\\.participants\\.[A-Za-z0-9_-]{1,128}\\.v1$',
  '^mn\\.speaker-state\\.[A-Za-z0-9_-]{1,128}\\.v1$',
];
