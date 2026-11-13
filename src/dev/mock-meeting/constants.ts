import type { MeetingState, Speaker } from '@/lib/meeting';

export const MOCK_SPEAKERS_CATALOG: Record<string, Speaker> = {
  'mic:0': { id: 'mic:0', source: 'mic', label: 'You', colorIndex: 0 },
  'system:0': { id: 'system:0', source: 'system', label: 'Sarah (Design)', colorIndex: 1 },
  'system:1': { id: 'system:1', source: 'system', label: 'Alex (Backend)', colorIndex: 2 },
};

export const INITIAL_STATE: MeetingState = {
  status: 'idle',
  mode: 'both',
  startedAt: null,
  serverReady: false,
  segments: [],
  speakers: {},
  error: null,
  callAudioMissing: false,
  warning: null,
  language: null,
  stats: null,
};

export const MOCK_LANG_NAMES: Record<string, string> = {
  auto: 'Auto',
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
};
