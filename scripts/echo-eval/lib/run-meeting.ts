import { splitTranscript } from '@/lib/meeting/split-transcript';
import { toFrames } from '@/lib/meeting/two-source-bleed.testSupport';
import type { Segment } from '@/lib/meeting/types';
import type { MeetingCase } from '../types/meeting-case';
import type { MeetingResult } from '../types/meeting-result';
import type { RenderedCase } from '../types/rendered-case';

interface Asr {
  pushLiveAudio: (s: 'mic' | 'system', f: ArrayBuffer) => void;
  flushLiveAudio: () => Promise<unknown>;
}

interface Store {
  resetSession: (m: 'both') => void;
  getState: () => { segments: Segment[] };
}

export async function runMeeting(c: MeetingCase, audio: RenderedCase, asr: Asr, store: Store): Promise<MeetingResult> {
  store.resetSession('both');
  for (const [source, pcm] of [['system', audio.system], ['mic', audio.mic]] as const) {
    for (const frame of toFrames(pcm)) asr.pushLiveAudio(source, frame);
  }
  await asr.flushLiveAudio();
  const all = store.getState().segments;
  const kept = new Set(splitTranscript(all).flatMap((b) => b.segments.map((s) => s.id)));
  const segments = all.map((s) => ({
    source: s.source,
    text: s.text,
    start: +s.start.toFixed(2),
    end: +s.end.toFixed(2),
    kept: kept.has(s.id),
  }));
  return { id: c.id, split: c.split, segments };
}
