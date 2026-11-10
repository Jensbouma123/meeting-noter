import { useSyncExternalStore } from 'react';
import type {
  CaptureMode,
  Levels,
  MeetingState,
  Segment,
  Source,
  Speaker,
  StartOpts,
  Status,
  SystemVia,
} from '@/lib/meeting';

export type { CaptureMode, Levels, MeetingState, Segment, Source, Speaker, StartOpts, Status, SystemVia };

interface ScriptTurn {
  speakerId: string;
  source: Source;
  words: string[];
}

const MOCK_SCRIPT: ScriptTurn[] = [
  {
    speakerId: 'system:0',
    source: 'system',
    words: [
      'Good', 'morning', 'team,', 'thanks', 'for', 'hopping', 'on.',
      'Let\'s', 'quickly', 'review', 'the', 'new', 'realtime', 'meeting', 'noter', 'interface.',
    ],
  },
  {
    speakerId: 'mic:0',
    source: 'mic',
    words: [
      'Morning', 'Sarah!', 'I', 'love', 'how', 'clean', 'the', 'layout', 'is.',
      'The', 'transcript', 'column', 'is', 'super', 'readable', 'and', 'the', 'dock', 'stays', 'out', 'of', 'the', 'way.',
    ],
  },
  {
    speakerId: 'system:1',
    source: 'system',
    words: [
      'From', 'the', 'engine', 'side,', 'we', 'are', 'streaming', 'audio', 'frames', 'at', '100', 'millisecond', 'intervals.',
      'Inference', 'lag', 'is', 'sitting', 'right', 'around', '85', 'milliseconds.',
    ],
  },
  {
    speakerId: 'system:0',
    source: 'system',
    words: [
      'Notice', 'how', 'the', 'turns', 'are', 'grouped', 'by', 'speaker,', 'with', 'smooth', 'transitions',
      'when', 'partials', 'ease', 'into', 'final', 'segments.',
    ],
  },
  {
    speakerId: 'mic:0',
    source: 'mic',
    words: [
      'The', 'audio', 'meters', 'are', 'rendered', 'with', 'direct', 'CSS', 'transforms',
      'in', 'a', 'requestAnimationFrame', 'loop,', 'keeping', 'the', 'UI', 'at', 'a', 'rock-solid', '60', 'frames', 'per', 'second.',
    ],
  },
  {
    speakerId: 'system:1',
    source: 'system',
    words: [
      'We', 'also', 'added', 'the', 'right', 'rail', 'with', 'live', 'talk-time', 'bars', 'and', 'inline', 'speaker', 'renaming.',
    ],
  },
  {
    speakerId: 'mic:0',
    source: 'mic',
    words: [
      'And', 'the', 'floating', 'dock', 'makes', 'it', 'effortless', 'to', 'pause,', 'resume,', 'or', 'toggle', 'audio', 'sources.',
    ],
  },
  {
    speakerId: 'system:0',
    source: 'system',
    words: [
      'Everything', 'respects', 'reduced-motion', 'settings', 'and', 'acciva', 'design', 'tokens.', 'We', 'are', 'good', 'to', 'go!',
    ],
  },
];

const MOCK_SPEAKERS_CATALOG: Record<string, Speaker> = {
  'mic:0': {
    id: 'mic:0',
    source: 'mic',
    label: 'You',
    colorIndex: 0,
  },
  'system:0': {
    id: 'system:0',
    source: 'system',
    label: 'Sarah (Design)',
    colorIndex: 1,
  },
  'system:1': {
    id: 'system:1',
    source: 'system',
    label: 'Alex (Backend)',
    colorIndex: 2,
  },
};

const INITIAL_STATE: MeetingState = {
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

let state: MeetingState = { ...INITIAL_STATE };
const listeners = new Set<() => void>();
const levelListeners = new Set<(l: Levels) => void>();

let streamTimer: ReturnType<typeof setTimeout> | null = null;
let langTimer: ReturnType<typeof setTimeout> | null = null;
let currentTurnIndex = 0;
let currentWordIndex = 0;
let currentSegmentId = 0;
let activeSpeakerId: string | null = null;
let isPaused = false;
let rafId: number | null = null;

const MOCK_LANG_NAMES: Record<string, string> = {
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

function clearLangTimer(): void {
  if (langTimer) {
    clearTimeout(langTimer);
    langTimer = null;
  }
}

/** Simulate detect (~3 s) then lock, like the server's vote-then-lock. */
function scheduleMockLanguage(): void {
  clearLangTimer();
  langTimer = setTimeout(() => {
    if (state.status !== 'live' && state.status !== 'paused') return;
    updateState({
      language: { code: 'nl', name: 'Nederlands', locked: false, confidence: 0.62 },
    });
    langTimer = setTimeout(() => {
      if (state.status !== 'live' && state.status !== 'paused') return;
      updateState({
        language: { code: 'nl', name: 'Nederlands', locked: true, confidence: 0.93 },
      });
      langTimer = null;
    }, 2500);
  }, 3000);
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function updateState(partial: Partial<MeetingState>): void {
  state = { ...state, ...partial };
  notify();
}

// Level simulation loop in rAF
let currentLevels: Levels = { mic: 0, system: 0 };
const targetLevels: Levels = { mic: 0, system: 0 };

function runLevelsLoop(): void {
  if (state.status === 'live' && !isPaused) {
    // Generate realistic fluctuating levels
    const isMicSpeaking = activeSpeakerId?.startsWith('mic:');
    const isSystemSpeaking = activeSpeakerId?.startsWith('system:');

    if (isMicSpeaking) {
      targetLevels.mic = 0.25 + Math.random() * 0.55;
      targetLevels.system = 0.02 + Math.random() * 0.04;
    } else if (isSystemSpeaking) {
      targetLevels.system = 0.3 + Math.random() * 0.5;
      targetLevels.mic = 0.02 + Math.random() * 0.03;
    } else {
      targetLevels.mic = 0.02 + Math.random() * 0.03;
      targetLevels.system = 0.02 + Math.random() * 0.03;
    }
  } else {
    targetLevels.mic = 0;
    targetLevels.system = 0;
  }

  // Smooth attack / release
  const attack = 0.5;
  const release = 0.08;
  const micK = targetLevels.mic > currentLevels.mic ? attack : release;
  const sysK = targetLevels.system > currentLevels.system ? attack : release;
  currentLevels.mic += (targetLevels.mic - currentLevels.mic) * micK;
  currentLevels.system += (targetLevels.system - currentLevels.system) * sysK;

  for (const listener of levelListeners) {
    listener({ mic: currentLevels.mic, system: currentLevels.system });
  }

  if (typeof window !== 'undefined' && (state.status === 'live' || state.status === 'paused')) {
    rafId = requestAnimationFrame(runLevelsLoop);
  }
}

function stopLevelsLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  currentLevels = { mic: 0, system: 0 };
  for (const listener of levelListeners) {
    listener({ mic: 0, system: 0 });
  }
}

function advanceSimulation(): void {
  if (state.status !== 'live' || isPaused) return;

  const turn = MOCK_SCRIPT[currentTurnIndex % MOCK_SCRIPT.length];
  activeSpeakerId = turn.speakerId;
  const segId = `mock-seg-${currentSegmentId}`;

  // Add speaker as they first talk (animated enter in UI)
  let updatedSpeakers = state.speakers;
  if (!state.speakers[turn.speakerId]) {
    const meta = MOCK_SPEAKERS_CATALOG[turn.speakerId] ?? {
      id: turn.speakerId,
      source: turn.source,
      label: turn.source === 'mic' ? 'You' : `Speaker ${turn.speakerId}`,
      colorIndex: Object.keys(state.speakers).length,
    };
    updatedSpeakers = {
      ...state.speakers,
      [turn.speakerId]: meta,
    };
  }

  currentWordIndex++;
  const wordsSoFar = turn.words.slice(0, currentWordIndex).join(' ');
  const isFinal = currentWordIndex >= turn.words.length;

  const nowSec = state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0;
  const segment: Segment = {
    id: segId,
    source: turn.source,
    speaker: turn.speakerId,
    text: wordsSoFar,
    start: Math.max(0, nowSec - currentWordIndex * 0.2),
    end: nowSec,
    final: isFinal,
  };

  // Upsert segment
  const existingIdx = state.segments.findIndex((s) => s.id === segId);
  let updatedSegments: Segment[];
  if (existingIdx >= 0) {
    updatedSegments = [...state.segments];
    updatedSegments[existingIdx] = segment;
  } else {
    updatedSegments = [...state.segments, segment];
  }

  updateState({
    speakers: updatedSpeakers,
    segments: updatedSegments,
    stats: {
      rtf: Number((0.25 + Math.random() * 0.08).toFixed(2)),
      lagMs: Math.round(75 + Math.random() * 35),
      rssMb: 412,
    },
  });

  if (isFinal) {
    activeSpeakerId = null;
    currentWordIndex = 0;
    currentTurnIndex++;
    currentSegmentId++;
    // Small conversational gap between turns
    streamTimer = setTimeout(advanceSimulation, 700 + Math.random() * 600);
  } else {
    // Word streaming interval
    streamTimer = setTimeout(advanceSimulation, 110 + Math.random() * 90);
  }
}

export function useMeeting<T>(selector: (s: MeetingState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(INITIAL_STATE)
  );
}

export const meeting = {
  async start(opts: StartOpts): Promise<void> {
    if (state.status === 'live' || state.status === 'connecting' || state.status === 'requesting') {
      return;
    }

    if (streamTimer) clearTimeout(streamTimer);
    clearLangTimer();
    isPaused = false;
    currentTurnIndex = 0;
    currentWordIndex = 0;
    currentSegmentId = 1;
    activeSpeakerId = null;

    const isDemo =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('demo') === '1';

    if (isDemo) {
      // In demo mode: immediately transition to live and start streaming
      updateState({
        status: 'live',
        mode: opts.mode,
        startedAt: Date.now() - 3200,
        serverReady: true,
        error: null,
        warning: null,
        language: null,
        segments: [],
        speakers: {},
        stats: { rtf: 0.28, lagMs: 82, rssMb: 410 },
      });

      if (typeof window !== 'undefined') {
        stopLevelsLoop();
        rafId = requestAnimationFrame(runLevelsLoop);
      }

      advanceSimulation();
      scheduleMockLanguage();
      return;
    }

    updateState({
      status: 'requesting',
      mode: opts.mode,
      startedAt: Date.now(),
      error: null,
      warning: null,
      language: null,
      segments: [],
      speakers: {},
    });

    await new Promise((r) => setTimeout(r, 200));
    updateState({ status: 'connecting', serverReady: true });

    await new Promise((r) => setTimeout(r, 250));
    updateState({
      status: 'live',
      stats: { rtf: 0.28, lagMs: 82, rssMb: 410 },
    });

    if (typeof window !== 'undefined') {
      stopLevelsLoop();
      rafId = requestAnimationFrame(runLevelsLoop);
    }

    streamTimer = setTimeout(advanceSimulation, 500);
    scheduleMockLanguage();
  },

  async stop(): Promise<void> {
    if (streamTimer) {
      clearTimeout(streamTimer);
      streamTimer = null;
    }
    clearLangTimer();
    isPaused = false;
    activeSpeakerId = null;
    stopLevelsLoop();
    updateState({ status: 'stopping' });
    await new Promise((r) => setTimeout(r, 150));
    updateState({ status: 'idle' });
  },

  pause(): void {
    if (state.status !== 'live') return;
    isPaused = true;
    activeSpeakerId = null;
    if (streamTimer) {
      clearTimeout(streamTimer);
      streamTimer = null;
    }
    updateState({ status: 'paused' });
  },

  resume(): void {
    if (state.status !== 'paused') return;
    isPaused = false;
    updateState({ status: 'live' });
    if (typeof window !== 'undefined' && rafId === null) {
      rafId = requestAnimationFrame(runLevelsLoop);
    }
    streamTimer = setTimeout(advanceSimulation, 300);
  },

  renameSpeaker(id: string, label: string): void {
    const existing = state.speakers[id];
    if (!existing) return;
    updateState({
      speakers: {
        ...state.speakers,
        [id]: { ...existing, label },
      },
    });
  },

  setLanguage(code: string): void {
    if (state.status !== 'live' && state.status !== 'paused') return;
    clearLangTimer();
    if (code === 'auto') {
      // Re-detect: detecting state now, lock shortly after.
      updateState({
        language: { code: 'nl', name: 'Nederlands', locked: false, confidence: 0.55 },
      });
      langTimer = setTimeout(() => {
        if (state.status !== 'live' && state.status !== 'paused') return;
        updateState({
          language: { code: 'nl', name: 'Nederlands', locked: true, confidence: 0.91 },
        });
        langTimer = null;
      }, 2500);
      return;
    }
    updateState({
      language: { code, name: MOCK_LANG_NAMES[code] ?? code, locked: true, confidence: 1 },
    });
  },

  subscribeLevels(cb: (l: Levels) => void): () => void {
    levelListeners.add(cb);
    if (typeof window !== 'undefined' && rafId === null && (state.status === 'live' || state.status === 'paused')) {
      rafId = requestAnimationFrame(runLevelsLoop);
    }
    return () => {
      levelListeners.delete(cb);
    };
  },

  async listMicDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        if (mics.length > 0) return mics;
      } catch {
        // Fallback to simulated mock devices below
      }
    }
    return [
      {
        deviceId: 'default',
        label: 'Default Microphone (Built-in)',
        kind: 'audioinput',
        groupId: 'default-grp',
        toJSON() { return this; },
      } as unknown as MediaDeviceInfo,
      {
        deviceId: 'airpods',
        label: 'AirPods Pro (Bluetooth)',
        kind: 'audioinput',
        groupId: 'airpods-grp',
        toJSON() { return this; },
      } as unknown as MediaDeviceInfo,
      {
        deviceId: 'studio-mic',
        label: 'USB Studio Condenser Mic',
        kind: 'audioinput',
        groupId: 'studio-grp',
        toJSON() { return this; },
      } as unknown as MediaDeviceInfo,
    ];
  },
};
