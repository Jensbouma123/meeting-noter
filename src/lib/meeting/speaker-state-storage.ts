import { isSerializedSpeakerState, type SpeakerStates } from '@/lib/diarization/browser/speaker-state';
import { isStorageAvailable } from './storage-available';
import type { Source } from './types';
import type { StoredSpeakerState } from './types/autosave';

const SPEAKER_STATE_KEY_PREFIX = 'mn.speaker-state.';
const SPEAKER_STATE_KEY_SUFFIX = '.v1';
const SPEAKER_STATE_VERSION = 1;
export const MAX_SPEAKER_STATES = 4;

export function speakerStateKey(sessionId: string): string {
  return `${SPEAKER_STATE_KEY_PREFIX}${sessionId}${SPEAKER_STATE_KEY_SUFFIX}`;
}

function storedSpeakerStateKeysOldestFirst(): string[] {
  const storage = window.localStorage;
  const found: { key: string; savedAt: number }[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(SPEAKER_STATE_KEY_PREFIX) || !key.endsWith(SPEAKER_STATE_KEY_SUFFIX)) continue;
    let savedAt = 0;
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? 'null') as Partial<StoredSpeakerState> | null;
      if (parsed && typeof parsed.savedAt === 'number') savedAt = parsed.savedAt;
    } catch {
      savedAt = 0;
    }
    found.push({ key, savedAt });
  }
  return found.sort((a, b) => a.savedAt - b.savedAt).map((f) => f.key);
}

export function saveSpeakerState(sessionId: string, sources: SpeakerStates): void {
  if (!isStorageAvailable() || typeof sessionId !== 'string' || sessionId.length === 0) return;
  const key = speakerStateKey(sessionId);
  try {
    if (Object.keys(sources).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const stored: StoredSpeakerState = {
      version: SPEAKER_STATE_VERSION,
      sessionId,
      savedAt: Date.now(),
      sources,
    };
    const value = JSON.stringify(stored);
    const others = storedSpeakerStateKeysOldestFirst().filter((k) => k !== key);
    for (const old of others.slice(0, Math.max(0, others.length - (MAX_SPEAKER_STATES - 1)))) {
      window.localStorage.removeItem(old);
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      for (const old of storedSpeakerStateKeysOldestFirst()) if (old !== key) window.localStorage.removeItem(old);
      window.localStorage.setItem(key, value);
    }
  } catch {
    return;
  }
}

export function loadSpeakerState(sessionId: string): SpeakerStates | null {
  if (!isStorageAvailable() || typeof sessionId !== 'string' || sessionId.length === 0) return null;
  try {
    const raw = window.localStorage.getItem(speakerStateKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSpeakerState>;
    if (!parsed || parsed.version !== SPEAKER_STATE_VERSION || parsed.sessionId !== sessionId) return null;
    if (!parsed.sources || typeof parsed.sources !== 'object') return null;
    const sources: SpeakerStates = {};
    for (const source of ['mic', 'system'] as Source[]) {
      const state: unknown = (parsed.sources as Record<string, unknown>)[source];
      if (isSerializedSpeakerState(state)) sources[source] = state;
    }
    return Object.keys(sources).length > 0 ? sources : null;
  } catch {
    return null;
  }
}

export function removeSpeakerState(sessionId: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(speakerStateKey(sessionId));
  } catch {
    return;
  }
}
