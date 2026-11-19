import { splitTranscript } from '@/lib/meeting/split-transcript';
import { toFrames } from '@/lib/meeting/two-source-bleed.testSupport';
import type { Segment } from '@/lib/meeting/types';
import type { CaseResult, SegmentView } from '../types/case-result';
import type { EvalCase } from '../types/eval-case';
import type { RenderedCase } from '../types/rendered-case';

const view = (s: Segment): SegmentView => ({ source: s.source, text: s.text, start: +s.start.toFixed(2), end: +s.end.toFixed(2) });

export async function runCase(
  c: EvalCase,
  audio: RenderedCase,
  asr: { pushLiveAudio: (s: 'mic' | 'system', f: ArrayBuffer) => void; flushLiveAudio: () => Promise<unknown> },
  store: { resetSession: (m: 'both') => void; getState: () => { segments: Segment[] } },
): Promise<CaseResult> {
  store.resetSession('both');
  for (const [source, pcm] of [['system', audio.system], ['mic', audio.mic]] as const) {
    for (const frame of toFrames(pcm)) asr.pushLiveAudio(source, frame);
  }
  await asr.flushLiveAudio();
  const all = store.getState().segments;
  const kept = new Set(splitTranscript(all).flatMap((b) => b.segments.map((s) => s.id)));
  const mic = all.filter((s) => s.source === 'mic');
  return {
    id: c.id,
    kind: c.kind,
    split: c.split,
    systemUtt: c.systemUtt,
    micUtt: c.micUtt,
    bleed: c.bleed,
    micAsr: mic.map(view),
    systemAsr: all.filter((s) => s.source === 'system').map(view),
    micSurvivors: mic.filter((s) => kept.has(s.id)).map(view),
    micDropped: mic.filter((s) => !kept.has(s.id)).map(view),
  };
}
