import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SortformerOutput, SortformerRunner, SpeakerTurn } from '@/lib/diarization/browser/types';

/**
 * Appending a recording to a session keeps who-is-who: record, persist,
 * reload the page, append, and a returning speaker keeps their label.
 *
 * Sortformer numbers speakers by arrival order in its speaker cache. A
 * resumed recording used to start from an empty cache, so whoever spoke
 * first was channel 0 again — `mic:0`, the transcript's first speaker's id
 * and label — whoever they were.
 *
 * The real `DiarizerCore` runs here, against a stand-in model that assigns
 * channels the way Sortformer does: by the order voices first appear in the
 * cached frames, then in the chunk. A frame's embedding carries its voice (1:
 * a low tone, 2: a high one, 0: silence), so the cache is what decides the
 * numbering, as it does for the real model. The diarization bridge is
 * replaced by one that feeds these cores directly (the worker and its
 * transport are covered in `src/lib/diarization/browser`).
 */

const SR = 16000;
const MEL = 128;
const HIDDEN = 512;
const SPEAKERS = 8;

class ArrivalOrderModel implements SortformerRunner {
  async run(features: Float32Array, numMelFrames: number, cached: Float32Array, numCached: number): Promise<SortformerOutput> {
    const voiceOfMel = (f: number): number => {
      const row = features.subarray(f * MEL, (f + 1) * MEL);
      const low = Math.max(...row.subarray(0, 40));
      const high = Math.max(...row.subarray(90, MEL));
      if (Math.max(low, high) < -8) return 0;
      return low > high ? 1 : 2;
    };
    const embedFrames = Math.ceil(numMelFrames / 8);
    const chunkVoices: number[] = [];
    for (let t = 0; t < embedFrames; t += 1) {
      let voice = 0;
      for (let f = t * 8; f < Math.min(numMelFrames, t * 8 + 8) && !voice; f += 1) voice = voiceOfMel(f);
      chunkVoices.push(voice);
    }
    const cachedVoices = Array.from({ length: numCached }, (_, t) => Math.round(cached[t * HIDDEN]));
    const order: number[] = [];
    for (const v of [...cachedVoices, ...chunkVoices]) if (v && !order.includes(v)) order.push(v);

    const logits = new Float32Array((numCached + embedFrames) * 8 * SPEAKERS).fill(-10);
    cachedVoices.forEach((v, t) => {
      if (!v) return;
      for (let j = 0; j < 8; j += 1) logits[(t * 8 + j) * SPEAKERS + order.indexOf(v)] = 10;
    });
    for (let f = 0; f < numMelFrames; f += 1) {
      const v = voiceOfMel(f);
      if (v) logits[(numCached * 8 + f) * SPEAKERS + order.indexOf(v)] = 10;
    }
    const chunkEmbeds = new Float32Array(embedFrames * HIDDEN);
    chunkVoices.forEach((v, t) => chunkEmbeds.fill(v, t * HIDDEN, (t + 1) * HIDDEN));
    return { logits, chunkEmbeds, silenceEmbeds: new Float32Array(HIDDEN) };
  }
}

const fake = vi.hoisted(() => ({
  cores: new Map<string, import('@/lib/diarization/browser/core').DiarizerCore>(),
  turns: [] as SpeakerTurn[],
}));

// The factory's result outlives `vi.resetModules()`, so every module it uses
// is imported at call time: the page's current instances, not the first's.
vi.mock('./diarization-bridge', () => {
  const shape = { hiddenSize: HIDDEN, numSpeakers: SPEAKERS };
  const mode = { chunkLength: 9, rightContext: 4, fifoLength: 30, updatePeriod: 20 };
  const speakerState = async () => ({
    ...(await import('@/lib/diarization/browser/speaker-handoff')),
    ...(await import('@/lib/diarization/browser/speaker-state')),
  });
  return {
    startDiarization(sources: string[]) {
      void (async () => {
        const { DiarizerCore } = await import('@/lib/diarization/browser/core');
        const state = await speakerState();
        const { upsertSegment } = await import('./store');
        for (const source of sources as ('mic' | 'system')[]) {
          const seed = state.speakerSeedFor(source);
          const core = new DiarizerCore({
            source,
            model: new ArrivalOrderModel(),
            mode,
            speakerState: seed ? state.deserializeSpeakerState(seed, shape) : null,
          });
          core.onSpeakerTurn((turn) => {
            fake.turns.push(turn);
            upsertSegment({
              id: turn.id!,
              source: turn.source,
              speaker: turn.speaker,
              text: `words ${turn.id}`,
              start: turn.start,
              end: turn.end,
              final: true,
            });
          });
          fake.cores.set(source, core);
        }
      })();
    },
    async flushDiarization() {
      const state = await speakerState();
      for (const [source, core] of fake.cores) {
        await core.flush();
        state.reportSpeakerState(source as 'mic', state.serializeSpeakerState(core.snapshotSpeakers(), shape));
      }
    },
    stopDiarization() {
      for (const core of fake.cores.values()) core.dispose();
      fake.cores.clear();
    },
    resetDiarization() {
      fake.cores.clear();
    },
    stopDiarizationForSource() {},
    pushDiarizationAudio() {},
  };
});

function tone(freq: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i += 1) out[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

const A = (s: number) => tone(200, s);
const B = (s: number) => tone(5000, s);
const quiet = (s: number) => new Float32Array(Math.round(s * SR));

async function speak(parts: Float32Array[]): Promise<void> {
  await vi.waitFor(() => expect(fake.cores.get('mic')).toBeDefined());
  const core = fake.cores.get('mic')!;
  let at = 0;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1600) {
      core.push(part.slice(i, i + 1600), at + i);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    at += part.length;
  }
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

class FakeAudioContext {
  state = 'running';
  sampleRate = 16000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
}

class FakeAudioWorkletNode {
  port = { onmessage: null, close: vi.fn() };
  disconnect = vi.fn();
}

let storage: Storage;

function installBrowser(): void {
  const track = { kind: 'audio', stop: vi.fn(), onended: null };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    },
  });
  vi.stubGlobal('window', { AudioContext: FakeAudioContext, localStorage: storage });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
}

/** A fresh page on the same storage: every module re-evaluated. */
async function loadPage() {
  vi.resetModules();
  fake.cores.clear();
  const { meeting } = await import('./index');
  const store = await import('./store');
  const sessions = await import('./session-store');
  return { meeting, store, sessions };
}

/** First recording of session `s1`: A, then B (renamed "Bob"), then A. */
async function recordFirstMeeting() {
  const page = await loadPage();
  const id = page.sessions.createDraftSession('Standup');
  page.store.bindTranscriptSession(id);
  await page.meeting.start({ mode: 'mic' });
  await speak([A(12), quiet(1.5), B(12), quiet(1.5), A(10), quiet(1.5)]);
  await page.meeting.stop();
  const speakers = fake.turns.map((t) => t.speaker);
  expect(new Set(speakers)).toEqual(new Set(['mic:0', 'mic:1']));
  expect(fake.turns.find((t) => t.start > 12 && t.start < 20)?.speaker).toBe('mic:1');
  page.meeting.renameSpeaker('mic:1', 'Bob');
  const s = page.store.getState();
  // What MeetingView's autosave writes.
  page.sessions.persistSession({ sessionId: id, segments: s.segments, speakers: s.speakers, startedAt: s.startedAt });
  return id;
}

/** Reload, append to `id`, and have B speak first, then A. */
async function appendMeeting(id: string) {
  const page = await loadPage();
  expect(page.sessions.startRecordingInSession(id, 'append')).toBe(id);
  fake.turns.length = 0;
  await page.meeting.start({ mode: 'mic' });
  await speak([B(6), quiet(1.5), A(6), quiet(1.5)]);
  await page.meeting.stop();
  const s = page.store.getState();
  const labelOf = (turn: SpeakerTurn | undefined) => (turn ? s.speakers[turn.speaker]?.label : undefined);
  return {
    first: labelOf(fake.turns.find((t) => t.start < 6)),
    second: labelOf(fake.turns.find((t) => t.start > 7)),
    firstId: fake.turns.find((t) => t.start < 6)?.speaker,
    speakers: s.speakers,
  };
}

describe('appending a recording to a session', () => {
  beforeEach(() => {
    storage = memoryStorage();
    fake.turns.length = 0;
    installBrowser();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps each returning speaker on their label after a reload', async () => {
    const id = await recordFirstMeeting();
    const resumed = await appendMeeting(id);
    // B speaks first, yet is still mic:1, "Bob"; A is still Speaker 1.
    expect(resumed.firstId).toBe('mic:1');
    expect(resumed.first).toBe('Bob');
    expect(resumed.second).toBe('Speaker 1');
    // No third speaker was invented.
    expect(Object.keys(resumed.speakers).sort()).toEqual(['mic:0', 'mic:1']);
  }, 30_000);

  it('still appends to a session saved without speaker state, numbering afresh', async () => {
    const id = await recordFirstMeeting();
    const { speakerStateKey } = await import('./speaker-state-storage');
    storage.removeItem(speakerStateKey(id));
    const resumed = await appendMeeting(id);
    // Without the cache the first voice is channel 0 again — the old
    // behaviour, and the most an old session can do.
    expect(resumed.firstId).toBe('mic:0');
    expect(resumed.first).toBe('Speaker 1');
  }, 30_000);

  it('drops the speaker state with the transcript', async () => {
    const id = await recordFirstMeeting();
    const { loadSpeakerState } = await import('./speaker-state-storage');
    expect(loadSpeakerState(id)?.mic).toBeDefined();
    const page = await loadPage();
    expect(page.sessions.clearSessionTranscript(id)).toBe(true);
    const persist = await import('./speaker-state-storage');
    expect(persist.loadSpeakerState(id)).toBeNull();
  }, 30_000);
});
