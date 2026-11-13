import { expect, vi } from 'vitest';
import type { SpeakerTurn } from '@/lib/diarization/browser/types';
import type { SpeakerResumeFake } from './types/speaker-resume-test';
import { A, ArrivalOrderModel, B, HIDDEN, SPEAKERS, quiet } from './speaker-resume-model';

const shared = globalThis as unknown as { speakerResumeFake?: SpeakerResumeFake };

export const fake: SpeakerResumeFake = (shared.speakerResumeFake ??= {
  cores: new Map(),
  turns: [],
});

export function mockDiarizationBridge() {
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
        const { upsertSegment } = await import('./segment-store');
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
  };}

export async function speak(parts: Float32Array[]): Promise<void> {
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
export async function loadPage() {
  vi.resetModules();
  fake.cores.clear();
  const { meeting } = await import('./index');
  const store = { ...(await import('./transcript-session')), ...(await import('./store-core')) };
  const sessions = {
    ...(await import('./session-crud')),
    ...(await import('./session-delete')),
    ...(await import('./session-recording')),
  };
  return { meeting, store, sessions };
}
export async function recordFirstMeeting() {
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
  page.sessions.persistSession({ sessionId: id, segments: s.segments, speakers: s.speakers, startedAt: s.startedAt });
  return id;
}
export async function appendMeeting(id: string) {
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