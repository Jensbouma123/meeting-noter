import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerializedSpeakerState } from '@/lib/diarization/browser/types';
import { MAX_SPEAKER_STATES, loadSpeakerState, removeSpeakerState, saveSpeakerState, speakerStateKey } from './speaker-state-storage';
import { saveSessionTranscript, sessionTranscriptKey } from './session-transcript-storage';

function memoryStorage(quotaChars = Infinity) {
  const data = new Map<string, string>();
  const used = () => [...data.values()].reduce((n, v) => n + v.length, 0);
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (used() - (data.get(k)?.length ?? 0) + v.length > quotaChars) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

function state(chars = 8): SerializedSpeakerState {
  return {
    version: 1,
    hiddenSize: 512,
    numSpeakers: 8,
    numFrames: 1,
    compressed: false,
    embeds: 'A'.repeat(chars),
    probs: 'AAAA',
  };
}

let storage: ReturnType<typeof memoryStorage>;

function install(quotaChars?: number) {
  storage = memoryStorage(quotaChars);
  vi.stubGlobal('window', { localStorage: storage });
}

describe('speaker state persistence', () => {
  beforeEach(() => install());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('round-trips per source, and a session without one loads as null', () => {
    expect(loadSpeakerState('s1')).toBeNull();
    saveSpeakerState('s1', { mic: state(), system: state(12) });
    expect(loadSpeakerState('s1')).toEqual({ mic: state(), system: state(12) });
    removeSpeakerState('s1');
    expect(loadSpeakerState('s1')).toBeNull();
  });

  it('ignores a corrupted or foreign entry', () => {
    storage.setItem(speakerStateKey('s1'), '{not json');
    expect(loadSpeakerState('s1')).toBeNull();
    storage.setItem(speakerStateKey('s1'), JSON.stringify({ version: 1, sessionId: 's2', savedAt: 1, sources: { mic: state() } }));
    expect(loadSpeakerState('s1')).toBeNull();
    storage.setItem(speakerStateKey('s1'), JSON.stringify({ version: 1, sessionId: 's1', savedAt: 1, sources: { mic: { embeds: 3 } } }));
    expect(loadSpeakerState('s1')).toBeNull();
  });

  it('saving nothing removes the state', () => {
    saveSpeakerState('s1', { mic: state() });
    saveSpeakerState('s1', {});
    expect(storage.getItem(speakerStateKey('s1'))).toBeNull();
  });

  it(`keeps the ${MAX_SPEAKER_STATES} most recently saved sessions`, () => {
    vi.useFakeTimers();
    for (let i = 0; i <= MAX_SPEAKER_STATES; i += 1) {
      vi.setSystemTime(1000 + i);
      saveSpeakerState(`s${i}`, { mic: state() });
    }
    expect(loadSpeakerState('s0')).toBeNull();
    for (let i = 1; i <= MAX_SPEAKER_STATES; i += 1) expect(loadSpeakerState(`s${i}`)).not.toBeNull();
  });

  it('drops other sessions\' states, never transcripts, when the quota is full', () => {
    install(3000);
    saveSessionTranscript({
      sessionId: 't',
      title: 'Kept',
      segments: [{ id: '1', source: 'mic', speaker: 'mic:0', text: 'hi', start: 0, end: 1, final: true }],
      speakers: {},
    });
    saveSpeakerState('old', { mic: state(1000) });
    saveSpeakerState('new', { mic: state(1500) });
    expect(loadSpeakerState('old')).toBeNull();
    expect(loadSpeakerState('new')).not.toBeNull();
    expect(storage.getItem(sessionTranscriptKey('t'))).not.toBeNull();
    // Too large even alone: given up, nothing else touched.
    saveSpeakerState('huge', { mic: state(5000) });
    expect(loadSpeakerState('huge')).toBeNull();
    expect(storage.getItem(sessionTranscriptKey('t'))).not.toBeNull();
  });
});
