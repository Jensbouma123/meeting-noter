import { vi } from 'vitest';

const h = vi.hoisted(() => ({
  start: vi.fn(async () => {}),
  state: {
    status: 'idle', error: null, warning: null, startedAt: null,
    segments: [], speakers: [], stats: {}, language: 'auto',
  } as Record<string, unknown>,
  settings: {
    mode: 'both', systemVia: 'browser', micDeviceId: 'default', language: 'auto',
    autoScroll: true, retention: 'forever', ownerName: '',
  },
  browserASR: { enabled: true, phase: 'ready' },
  registry: { entries: {} },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/components/meeting', () => ({
  useMeeting: (sel: (s: Record<string, unknown>) => unknown) => sel(h.state),
  meeting: { start: h.start, stop: vi.fn() },
  TopBar: () => null,
  RightRail: () => null,
  LiveTranscript: () => null,
  BottomDock: () => null,
  SettingsSheet: () => null,
  DEFAULT_SETTINGS: h.settings,
  loadSettings: () => ({ ...h.settings }),
  saveSettings: vi.fn(),
  loadSavedTitle: () => 'Untitled meeting',
  saveTitle: vi.fn(),
}));
vi.mock('@/components/meeting/modelProgress', () => ({
  deriveModelProgress: () => ({ stage: null, percent: null }),
}));
vi.mock('@/components/meeting/modelReadiness', () => ({
  deriveModelReadiness: () => 'ready',
}));
vi.mock('@/lib/meeting', () => ({
  getBrowserASRProgress: () => h.browserASR,
  getBrowserASRStatusMessage: () => null,
  getServerBrowserASRProgress: () => h.browserASR,
  enableBrowserASR: vi.fn(),
  subscribeBrowserASR: () => () => {},
  warmBrowserASR: vi.fn(),
  promptBrowserASRDownload: vi.fn(),
  getPostStopTranscriptionProgress: () => null,
  getServerPostStopProgress: () => null,
  subscribePostStopTranscription: () => () => {},
}));
vi.mock('@/components/models', () => ({
  ModelRegistryProvider: ({ children }: { children: unknown }) => children,
  subscribeRegistry: () => () => {},
  getState: () => h.registry,
  getServerSnapshot: () => h.registry,
}));
vi.mock('@/lib/meeting/session-reset', () => ({
  restoreSnapshot: vi.fn(),
  loadIdleSession: () => false,
}));
vi.mock('@/lib/meeting/transcript-session', () => ({
  bindTranscriptSession: vi.fn(),
  getTranscriptSessionId: () => null,
}));
vi.mock('@/lib/meeting/store-core', () => ({
  getState: () => h.state,
}));
vi.mock('@/lib/meeting/append-mode', () => ({
  cancelAppend: vi.fn(),
}));
vi.mock('@/lib/meeting/session-open', () => ({
  sessionExists: () => false,
  openSession: () => null,
  archiveAutosavedSession: vi.fn(),
  getSessionMetadata: () => null,
  sessionHasTranscript: () => false,
}));
vi.mock('@/lib/meeting/session-crud', () => ({
  unmarkDraft: vi.fn(),
  setSessionCaptureMode: vi.fn(),
  persistSession: vi.fn(),
  renameSession: vi.fn(),
}));
vi.mock('@/lib/meeting/session-recording', () => ({
  startRecordingInSession: vi.fn(),
}));
vi.mock('@/lib/meeting/session-delete', () => ({
  clearSessionTranscript: vi.fn(),
}));
vi.mock('@/lib/meeting/autosave', () => ({
  loadAutosavedSession: () => null,
  scheduleAutosave: vi.fn(),
  clearAutosavedSession: vi.fn(),
  flushAutosave: vi.fn(),
}));
vi.mock('@/lib/meeting/client-session-id', () => ({ getClientSessionId: () => 'client-1' }));
vi.mock('@/lib/meeting/meeting-loader', () => ({ ensureMeetingLoaded: () => Promise.resolve() }));
vi.mock('@/lib/meeting/participants', () => ({
  getParticipants: () => [],
  hasAskedParticipants: () => true,
  setParticipants: vi.fn(),
  skipParticipants: vi.fn(),
}));
vi.mock('@/components/onboarding/OnboardingDialog', () => ({ OnboardingDialog: () => null }));
vi.mock('@/components/meeting/RecordTargetDialog', () => ({ RecordTargetDialog: () => null }));
vi.mock('@/components/meeting/ParticipantsDialog', () => ({ ParticipantsDialog: () => null }));
vi.mock('@/components/meeting/CaptureDiagnostics', () => ({ CaptureDiagnostics: () => null }));
vi.mock('@/components/meeting/ShortcutsHelp', () => ({ ShortcutsHelp: () => null }));
vi.mock('@/components/share/ShareDialog', () => ({ ShareDialog: () => null }));
vi.mock('@/components/update/useUpdate', () => ({ useUpdate: () => ({}) }));
vi.mock('@/lib/lifecycle/useServerHeartbeat', () => ({ useServerHeartbeat: () => {} }));
vi.mock('@/lib/i18n/useT', () => ({ useT: () => (key: string) => key }));
vi.mock('lucide-react', () => ({ MicOff: () => null }));
vi.mock('@jensbouma123/acciva-ui', () => {
  const toast = Object.assign(vi.fn(), { danger: vi.fn(), warning: vi.fn(), success: vi.fn() });
  return {
    useToast: () => ({ toast, dismiss: vi.fn() }),
    Alert: () => null,
    Button: () => null,
    HStack: () => null,
    Text: () => null,
    VStack: () => null,
  };
});

export { h };
