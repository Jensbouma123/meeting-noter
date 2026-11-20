import { REALTIME_MODE } from '@/lib/diarization/browser/constants';
import { DiarizerCore } from '@/lib/diarization/browser/core';
import { SAMPLE_RATE } from '@/lib/diarization/browser/manifest';
import type { SpeakerTurn } from '@/lib/diarization/browser/types';
import type { DiarizeClipOptions, DiarizeClipResult, DiarizerCoreQueue } from '../types/diar-host';

export async function diarizeClip(pcm: Float32Array, opts: DiarizeClipOptions): Promise<DiarizeClipResult> {
  const step = opts.frameSamples ?? 800;
  const core = new DiarizerCore({
    source: opts.source ?? 'system',
    model: opts.model,
    mode: opts.mode ?? REALTIME_MODE,
    turns: { provisional: true },
  });
  const turns: SpeakerTurn[] = [];
  core.onSpeakerTurn((t) => turns.push(t));
  const t0 = performance.now();
  for (let i = 0; i < pcm.length; i += step) {
    core.push(pcm.slice(i, Math.min(pcm.length, i + step)), i);
    await (core as unknown as DiarizerCoreQueue).running;
  }
  await core.flush();
  const finalTurns = turns.filter((t) => t.final !== false);
  const slots = [...new Set(finalTurns.map((t) => t.speaker))].sort();
  const rtf = (performance.now() - t0) / 1000 / (pcm.length / SAMPLE_RATE);
  return { turns, finalTurns, slots, rtf };
}
