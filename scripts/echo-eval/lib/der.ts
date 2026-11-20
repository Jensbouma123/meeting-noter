import type { DerScore } from '../types/der-score';
import type { HypSegment } from '../types/hyp-segment';
import type { RefTurn } from '../types/ref-turn';

export const FRAME_SEC = 0.01;
export const COLLAR_SEC = 0.25;
const UNLABELED = '\u0000unlabeled';

const frame = (sec: number): number => Math.max(0, Math.round(sec / FRAME_SEC));

/** Per-key activity masks over `n` frames; a frame is active when its index lies in [start, end). */
function masks(spans: { start: number; end: number; key: string }[], n: number): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  for (const { start, end, key } of spans) {
    const m = out.get(key) ?? new Uint8Array(n);
    m.fill(1, Math.min(n, frame(start)), Math.min(n, frame(end)));
    out.set(key, m);
  }
  return out;
}

/**
 * Frame-level diarization error as in pyannote.metrics with overlap scored: per 10 ms frame,
 * miss = max(0, Nref - Nhyp), false alarm = max(0, Nhyp - Nref), confusion = min(Nref, Nhyp) - correct,
 * where correct counts reference speakers active together with a hyp label mapped to them.
 * Frames within `collar` seconds of any reference turn boundary are not scored.
 * Hyp lines without a label count as one unknown speaker. Null when no hyp line is labelled.
 */
export function diarizationError(turns: RefTurn[], segs: HypSegment[], labelMap: Record<string, string>, collar = COLLAR_SEC): DerScore | null {
  if (!segs.some((s) => s.label)) return null;
  const n = frame(Math.max(0, ...turns.map((t) => t.end), ...segs.map((s) => s.end)));
  const ref = masks(turns.map((t) => ({ start: t.start, end: t.end, key: t.speaker })), n);
  const hyp = masks(segs.map((s) => ({ start: s.start, end: s.end, key: s.label || UNLABELED })), n);
  const skip = new Uint8Array(n);
  for (const t of turns) for (const b of [t.start, t.end]) skip.fill(1, Math.min(n, frame(b - collar)), Math.min(n, frame(b + collar)));
  const refList = [...ref.entries()];
  const hypList = [...hyp.entries()].map(([label, m]) => ({ m, speaker: labelMap[label] ?? null }));
  let total = 0;
  let miss = 0;
  let fa = 0;
  let conf = 0;
  for (let i = 0; i < n; i += 1) {
    if (skip[i]) continue;
    let nRef = 0;
    let nHyp = 0;
    let correct = 0;
    for (const [, m] of refList) nRef += m[i];
    for (const h of hypList) nHyp += h.m[i];
    for (const [speaker, m] of refList) {
      if (m[i] && hypList.some((h) => h.m[i] && h.speaker === speaker)) correct += 1;
    }
    total += nRef;
    miss += Math.max(0, nRef - nHyp);
    fa += Math.max(0, nHyp - nRef);
    conf += Math.min(nRef, nHyp) - correct;
  }
  const sec = (k: number): number => Math.round(k * FRAME_SEC * 100) / 100;
  return { scoredSec: sec(total), missSec: sec(miss), falseAlarmSec: sec(fa), confusionSec: sec(conf), der: total ? (miss + fa + conf) / total : 0 };
}
