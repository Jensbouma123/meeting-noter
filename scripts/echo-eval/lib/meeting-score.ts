import type { MeetingCase, MeetingTurn } from '../types/meeting-case';
import type { MeetingScore, PairScore, ScoredMeetingResult, ScoredSegment, SpeakerScore, TurnScore } from '../types/meeting-score';
import { DUP_SIMILARITY, dice, wordCount } from './classify';

const COVER = 0.5;
const DUP_TAIL_SEC = 0.8;
const SOURCES = ['mic', 'system'] as const;
const isKept = (s: ScoredSegment): boolean => s.kept !== false;
const overlap = (a0: number, a1: number, b0: number, b1: number): number => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const sourceOf = (t: MeetingTurn): 'mic' | 'system' => (t.role === 'remote' ? 'system' : 'mic');
const iou = (s: ScoredSegment, t: MeetingTurn): number => {
  const ov = overlap(s.start, s.end, t.startSec, t.endSec);
  return ov / Math.max(0.01, s.end - s.start + (t.endSec - t.startSec) - ov);
};
export function covers(s: ScoredSegment, t: MeetingTurn): boolean {
  if (s.source !== sourceOf(t) || wordCount(s.text) < 2) return false;
  return overlap(s.start, s.end, t.startSec, t.endSec) / Math.max(0.01, Math.min(s.end - s.start, t.endSec - t.startSec)) >= COVER;
}
function mergeSpans(spans: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const [s, e] of spans.filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); else out.push([s, e]);
  }
  return out;
}
const overlapTime = (a: [number, number][], b: [number, number][]): number =>
  a.reduce((s, [a0, a1]) => s + b.reduce((t, [b0, b1]) => t + overlap(a0, a1, b0, b1), 0), 0);

function maxMatch(w: number[][]): Map<number, number> {
  const r = w.length;
  const c = w[0]?.length ?? 0;
  const size = 1 << c;
  const dp = new Float64Array(size).fill(-1);
  const pick = Array.from({ length: r }, () => new Int8Array(size).fill(-1));
  dp[0] = 0;
  for (let i = 0; i < r; i += 1) {
    const next = dp.slice();
    for (let m = 0; m < size; m += 1) if (dp[m] >= 0) for (let j = 0; j < c; j += 1) {
      if ((m & (1 << j)) || w[i][j] <= 0) continue;
      const nm = m | (1 << j);
      if (dp[m] + w[i][j] > next[nm]) { next[nm] = dp[m] + w[i][j]; pick[i][nm] = j; }
    }
    dp.set(next);
  }
  let best = 0;
  for (let m = 1; m < size; m += 1) if (dp[m] > dp[best]) best = m;
  const out = new Map<number, number>();
  for (let i = r - 1; i >= 0; i -= 1) if (pick[i][best] >= 0) { const j = pick[i][best]; out.set(i, j); best ^= 1 << j; }
  return out;
}

function assignLabels(real: MeetingTurn[], kept: ScoredSegment[]) {
  const bySource = { mic: new Map<string, string>(), system: new Map<string, string>() };
  const bySpeaker = new Map<string, string>();
  const labelMap: Record<string, string> = {};
  let shownSpeakers = 0;
  let phantomSpeakers = 0;
  for (const src of SOURCES) {
    const speakers = [...new Set(real.filter((t) => sourceOf(t) === src).map((t) => t.speaker))].sort();
    const labels = [...new Set(kept.filter((s) => s.source === src && Boolean(s.label)).map((s) => s.label!))].sort();
    const sSpans = speakers.map((id) => mergeSpans(real.filter((t) => t.speaker === id).map((t) => [t.startSec, t.endSec])));
    const lSpans = labels.map((lb) => mergeSpans(kept.filter((s) => s.source === src && s.label === lb).map((s) => [s.start, s.end])));
    const match = maxMatch(lSpans.map((ls) => sSpans.map((ss) => overlapTime(ls, ss))));
    shownSpeakers += labels.length;
    phantomSpeakers += labels.length - match.size;
    for (const [li, si] of match) {
      bySource[src].set(labels[li], speakers[si]);
      bySpeaker.set(speakers[si], labels[li]);
      labelMap[labels[li] in labelMap ? `${src}:${labels[li]}` : labels[li]] = speakers[si];
    }
  }
  return { bySource, bySpeaker, labelMap, shownSpeakers, phantomSpeakers };
}

function associateSegments(real: MeetingTurn[], kept: ScoredSegment[], bySource: Record<'mic' | 'system', Map<string, string>>) {
  const mapped = (s: ScoredSegment): string | null => (s.label ? (bySource[s.source].get(s.label) ?? null) : null);
  const owned = real.map((): ScoredSegment[] => []);
  const ownerOf = new Map<ScoredSegment, number>();
  for (const s of kept) {
    const cands = real.flatMap((t, i) => (covers(s, t) ? [i] : []));
    if (!cands.length) continue;
    const m = mapped(s);
    cands.sort((a, b) => {
      const di = iou(s, real[b]) - iou(s, real[a]);
      return Math.abs(di) > 1e-6 ? di : Number(m === real[b].speaker) - Number(m === real[a].speaker) || overlap(s.start, s.end, real[b].startSec, real[b].endSec) - overlap(s.start, s.end, real[a].startSec, real[a].endSec);
    });
    ownerOf.set(s, cands[0]);
    owned[cands[0]].push(s);
  }
  const mergedSegs = new Set<ScoredSegment>();
  const mergedTurns = new Set<number>();
  for (let i = 0; i < real.length; i += 1) {
    if (owned[i].length) continue;
    const cands = kept.filter((s) => covers(s, real[i]) && ownerOf.has(s) && real[ownerOf.get(s)!].speaker !== real[i].speaker).sort((a, b) => iou(b, real[i]) - iou(a, real[i]));
    if (!cands.length) continue;
    mergedSegs.add(cands[0]);
    mergedTurns.add(i);
    mergedTurns.add(ownerOf.get(cands[0])!);
  }
  return { mapped, owned, mergedSegs, mergedTurns };
}
const isAttributed = (t: MeetingTurn, segs: ScoredSegment[], mapped: (s: ScoredSegment) => string | null): boolean => {
  const total = segs.reduce((sum, s) => sum + overlap(s.start, s.end, t.startSec, t.endSec), 0);
  const right = segs.reduce((sum, s) => sum + (mapped(s) === t.speaker ? overlap(s.start, s.end, t.startSec, t.endSec) : 0), 0);
  return total > 0 && right * 2 > total;
};
const twins = (segs: ScoredSegment[], t: MeetingTurn, own: ScoredSegment[]): ScoredSegment[] =>
  t.role === 'remote' && own.length
    ? segs.filter((s) => s.source === 'mic' && isKept(s) && s.end > t.startSec && s.start < t.endSec + DUP_TAIL_SEC && dice(s.text, own.map((x) => x.text).join(' ')) >= DUP_SIMILARITY)
    : [];
const buildSpeakers = (real: MeetingTurn[], turns: TurnScore[], bySpeaker: Map<string, string> | null): SpeakerScore[] =>
  [...new Set(real.map((t) => t.speaker))].map((speaker) => {
    const idx = real.flatMap((t, i) => (t.speaker === speaker ? [i] : []));
    return { speaker, role: real[idx[0]].role, lang: real[idx[0]].lang, label: bySpeaker?.get(speaker) ?? null, turns: idx.length, kept: idx.filter((i) => turns[i].kept).length, attributed: idx.filter((i) => turns[i].attributed === true).length, lost: idx.filter((i) => turns[i].lost).length };
  });

export function scoreMeeting(c: MeetingCase, r: ScoredMeetingResult): MeetingScore {
  const real = c.turns.filter((t) => t.event !== 'backchannel');
  const keptSegs = r.segments.filter(isKept);
  const labeled = r.segments.some((s) => Boolean(s.label));
  const assigned = labeled ? assignLabels(real, keptSegs) : null;
  const assoc = assigned ? associateSegments(real, keptSegs, assigned.bySource) : null;
  const twinSet = new Set<ScoredSegment>();
  const turns: TurnScore[] = real.map((t, i) => {
    const own = r.segments.filter((s) => covers(s, t));
    const kept = own.some(isKept);
    const twin = twins(r.segments, t, own);
    for (const s of twin) twinSet.add(s);
    return { speaker: t.speaker, role: t.role, lang: t.lang, event: t.event, pairing: t.pairing, overlapFrac: t.overlapFrac, heard: own.length > 0, kept, lost: own.length > 0 && !kept, dups: twin.length, attributed: assoc ? isAttributed(t, assoc.owned[i], assoc.mapped) : null, merged: assoc ? assoc.mergedTurns.has(i) : false };
  });
  const pairs: PairScore[] = [];
  for (const id of new Set(real.filter((t) => t.pairId !== null).map((t) => t.pairId))) {
    const idx = real.flatMap((t, i) => (t.pairId === id ? [i] : []));
    if (idx.length !== 2) continue;
    const [ia, ib] = idx;
    const [a, b, sa, sb] = [real[ia], real[ib], turns[ia], turns[ib]];
    const merged = sourceOf(a) === sourceOf(b) && (assoc ? [...assoc.mergedSegs].some((s) => covers(s, a) && covers(s, b) && (assoc.owned[ia].length === 0 || assoc.owned[ib].length === 0)) : keptSegs.some((s) => covers(s, a) && covers(s, b)));
    if (!assoc && merged) sa.merged = sb.merged = true;
    pairs.push({ pairing: a.pairing!, overlapFrac: a.overlapFrac!, lang: a.lang === b.lang ? a.lang : 'mixed', bothKept: sa.kept && sb.kept && !merged, bothAttributed: labeled ? sa.attributed === true && sb.attributed === true && !merged : null, merged, echoMarked: sa.lost || sb.lost });
  }
  const ids = [...new Set(real.map((t) => t.speaker))];
  const keptIds = ids.filter((id) => turns.some((t, i) => real[i].speaker === id && t.kept));
  const phantom = new Set(turns.flatMap((t, i) => (t.dups > 0 ? [real[i].speaker] : [])));
  const junk = keptSegs.filter((s) => s.source === 'mic' && wordCount(s.text) >= 2 && !twinSet.has(s) && !real.some((t) => t.role === 'local' && covers(s, t)));
  const mergedLines = assoc ? assoc.mergedSegs.size : keptSegs.filter((s) => new Set(real.filter((t) => covers(s, t)).map((t) => t.speaker)).size >= 2).length;
  return { id: c.id, split: c.split, lang: c.lang, labeled, truthSpeakers: ids.length, shownSpeakers: assigned ? assigned.shownSpeakers : keptIds.length + phantom.size, phantomSpeakers: assigned ? assigned.phantomSpeakers : phantom.size, lostSpeakers: assigned ? ids.length - assigned.bySpeaker.size : ids.length - keptIds.length, mergedLines, junkMicLines: junk.length, turns, pairs, speakers: buildSpeakers(real, turns, assigned?.bySpeaker ?? null), labelMap: assigned ? assigned.labelMap : {} };
}
