import type { MeetingCase, MeetingTurn } from '../types/meeting-case';
import type { MeetingResult, MeetingSegment } from '../types/meeting-result';
import type { MeetingScore, PairScore, TurnScore } from '../types/meeting-score';
import { DUP_SIMILARITY, dice, wordCount } from './classify';

const COVER = 0.5;
const DUP_TAIL_SEC = 0.8;

const overlap = (a0: number, a1: number, b0: number, b1: number): number => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const sourceOf = (t: MeetingTurn): 'mic' | 'system' => (t.role === 'remote' ? 'system' : 'mic');

export function covers(s: MeetingSegment, t: MeetingTurn): boolean {
  if (s.source !== sourceOf(t) || wordCount(s.text) < 2) return false;
  const shorter = Math.max(0.01, Math.min(s.end - s.start, t.endSec - t.startSec));
  return overlap(s.start, s.end, t.startSec, t.endSec) / shorter >= COVER;
}

function twins(segs: MeetingSegment[], t: MeetingTurn, own: MeetingSegment[]): MeetingSegment[] {
  if (t.role !== 'remote' || !own.length) return [];
  const reference = own.map((s) => s.text).join(' ');
  return segs.filter(
    (s) => s.source === 'mic' && s.kept && s.end > t.startSec && s.start < t.endSec + DUP_TAIL_SEC && dice(s.text, reference) >= DUP_SIMILARITY,
  );
}

function scoreTurn(segs: MeetingSegment[], t: MeetingTurn): { score: TurnScore; twin: MeetingSegment[] } {
  const own = segs.filter((s) => covers(s, t));
  const kept = own.some((s) => s.kept);
  const twin = twins(segs, t, own);
  const score = { speaker: t.speaker, role: t.role, lang: t.lang, event: t.event, heard: own.length > 0, kept, lost: own.length > 0 && !kept, dups: twin.length };
  return { score, twin };
}

function scorePair(segs: MeetingSegment[], pair: [MeetingTurn, MeetingTurn], scores: TurnScore[]): PairScore {
  const [a, b] = pair;
  const [sa, sb] = scores;
  const merged = sourceOf(a) === sourceOf(b) && segs.some((s) => s.kept && covers(s, a) && covers(s, b));
  return {
    pairing: a.pairing!,
    overlapFrac: a.overlapFrac!,
    lang: a.lang === b.lang ? a.lang : 'mixed',
    bothKept: sa.kept && sb.kept && !merged,
    merged,
    echoMarked: sa.lost || sb.lost,
  };
}

export function scoreMeeting(c: MeetingCase, r: MeetingResult): MeetingScore {
  const real = c.turns.filter((t) => t.event !== 'backchannel');
  const scored = real.map((t) => scoreTurn(r.segments, t));
  const turns = scored.map((x) => x.score);
  const twinSet = new Set(scored.flatMap((x) => x.twin));
  const pairs: PairScore[] = [];
  for (const id of new Set(real.filter((t) => t.pairId !== null).map((t) => t.pairId))) {
    const idx = real.flatMap((t, i) => (t.pairId === id ? [i] : []));
    if (idx.length === 2) pairs.push(scorePair(r.segments, [real[idx[0]], real[idx[1]]], [turns[idx[0]], turns[idx[1]]]));
  }
  const ids = [...new Set(real.map((t) => t.speaker))];
  const keptIds = ids.filter((id) => turns.some((t, i) => real[i].speaker === id && t.kept));
  const phantom = new Set(turns.flatMap((t, i) => (t.dups > 0 ? [real[i].speaker] : [])));
  const junk = r.segments.filter(
    (s) => s.source === 'mic' && s.kept && wordCount(s.text) >= 2 && !twinSet.has(s) && !real.some((t) => t.role === 'local' && covers(s, t)),
  );
  return {
    id: c.id,
    split: c.split,
    lang: c.lang,
    truthSpeakers: ids.length,
    shownSpeakers: keptIds.length + phantom.size,
    phantomSpeakers: phantom.size,
    lostSpeakers: ids.length - keptIds.length,
    junkMicLines: junk.length,
    turns,
    pairs,
  };
}
