import { classifyEcho } from '@/lib/meeting/echo/echo-classify';
import { dropEchoTwins } from '@/lib/meeting/echo-twins';
import type { Segment } from '@/lib/meeting/types';
import type { EchoConfig } from '@/lib/meeting/types/echo-config';
import type { CaseResult, SegmentView } from '../types/case-result';
import type { MeasuredCase } from '../types/measured-case';
import type { TuneScore } from '../types/tune-score';
import { echoPresent, isFalseDrop, isMiss } from './classify';

const toSegment = (v: SegmentView, id: string): Segment => ({ ...v, id, speaker: v.source, final: true });

export function rescore(c: MeasuredCase, cfg: EchoConfig | null): CaseResult {
  const mic = c.result.micAsr.map((v, i) => {
    const echo = cfg ? classifyEcho(c.features[i], cfg) : undefined;
    return { ...toSegment(v, `m${i}`), ...(echo ? { echo } : {}) };
  });
  const system = c.result.systemAsr.map((v, i) => toSegment(v, `s${i}`));
  const kept = new Set(dropEchoTwins([...system, ...mic]).map((s) => s.id));
  return {
    ...c.result,
    micSurvivors: c.result.micAsr.filter((_, i) => kept.has(`m${i}`)),
    micDropped: c.result.micAsr.filter((_, i) => !kept.has(`m${i}`)),
  };
}

const memo = new WeakMap<MeasuredCase, Map<string, CaseResult>>();

function cached(c: MeasuredCase, cfg: EchoConfig | null): CaseResult {
  const key = c.features.map((f) => (cfg ? (classifyEcho(f, cfg) ?? '-') : '-')).join('');
  let seen = memo.get(c);
  if (!seen) memo.set(c, (seen = new Map()));
  let r = seen.get(key);
  if (!r) seen.set(key, (r = rescore(c, cfg)));
  return r;
}

export function scoreAll(cases: MeasuredCase[], cfg: EchoConfig | null): TuneScore {
  const s: TuneScore = { miss: 0, heard: 0, falseDrop: 0, crosstalk: 0 };
  for (const c of cases) {
    const r = cached(c, cfg);
    if (r.kind === 'echo' && echoPresent(r)) {
      s.heard += 1;
      if (isMiss(r)) s.miss += 1;
    }
    if (r.kind === 'crosstalk') {
      s.crosstalk += 1;
      if (isFalseDrop(r)) s.falseDrop += 1;
    }
  }
  return s;
}
