import { toFrames } from '@/lib/meeting/two-source-bleed.testSupport';
import type { MeetingAsr, MeetingStore } from '../types/meeting-engine';
import type { MeetingCase } from '../types/meeting-case';
import type { MeetingResult } from '../types/meeting-result';
import type { RenderedCase } from '../types/rendered-case';
import { meetingSegments } from './meeting-segments';

const STEP_FRAMES = 10;
const IDLE_POLLS = 3;
const POLL_MS = 10;

async function settle(): Promise<void> {
  const { asrState } = await import('@/lib/meeting/asr/state');
  const { liveChunkers } = await import('@/lib/meeting/asr/live-state');
  for (let idle = 0; idle < IDLE_POLLS; ) {
    const busy = asrState.transcribeInFlight || [...liveChunkers.values()].some((c) => c.due());
    idle = busy ? 0 : idle + 1;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

export async function runMeeting(c: MeetingCase, audio: RenderedCase, asr: MeetingAsr, store: MeetingStore): Promise<MeetingResult> {
  store.resetSession('both');
  await asr.startSpeakers?.();
  const push = asr.route ?? asr.pushLiveAudio;
  const system = toFrames(audio.system);
  const mic = toFrames(audio.mic);
  for (let at = 0; at < system.length; at += STEP_FRAMES) {
    for (const frame of system.slice(at, at + STEP_FRAMES)) push('system', frame);
    for (const frame of mic.slice(at, at + STEP_FRAMES)) push('mic', frame);
    await asr.settleSpeakers?.();
    await settle();
  }
  await (asr.flushSpeakers ? asr.flushSpeakers() : asr.flushLiveAudio());
  const diarized = !!asr.route;
  return { id: c.id, split: c.split, diarized, segments: meetingSegments(store.getState().segments, diarized) };
}
