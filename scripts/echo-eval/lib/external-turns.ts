import type { ExternalTurn } from '../types/external-reference';
import type { MeetingEvent, MeetingTurn } from '../types/meeting-case';

const BACKCHANNEL_SEC = 1;

const overlap = (a: ExternalTurn, b: ExternalTurn): number => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));

function eventOf(t: ExternalTurn, i: number, all: ExternalTurn[]): MeetingEvent {
  const others = all.filter((_, j) => j !== i);
  if (t.end - t.start < BACKCHANNEL_SEC && others.some((o) => overlap(t, o) > 0)) return 'backchannel';
  return others.some((o) => o.start < t.start && t.start < o.end) ? 'interrupt' : 'turn';
}

export function referenceTurns(ref: ExternalTurn[], lang: 'nl' | 'en'): MeetingTurn[] {
  const sorted = ref.filter((t) => t.end > t.start).sort((a, b) => a.start - b.start || a.end - b.end);
  const turns: MeetingTurn[] = sorted.map((t, i) => ({
    utt: '',
    speaker: t.spk,
    role: 'remote',
    lang,
    event: eventOf(t, i, sorted),
    startSec: t.start,
    endSec: t.end,
    clipSec: null,
    pairId: null,
    pairing: null,
    overlapFrac: null,
    ...(t.text === undefined ? {} : { refText: t.text }),
  }));
  let pairId = 0;
  turns.forEach((b, i) => {
    if (b.event !== 'interrupt') return;
    const host = turns
      .flatMap((a, j) => (j < i && a.pairId === null && a.event !== 'backchannel' && a.speaker !== b.speaker && a.endSec > b.startSec ? [j] : []))
      .sort((x, y) => overlap(sorted[i], sorted[y]) - overlap(sorted[i], sorted[x]))[0];
    if (host === undefined || b.pairId !== null) return;
    const a = turns[host];
    const frac = overlap(sorted[host], sorted[i]) / Math.min(a.endSec - a.startSec, b.endSec - b.startSec);
    const tag = { pairId, pairing: 'remote+remote' as const, overlapFrac: +Math.min(1, frac).toFixed(2) };
    Object.assign(a, tag);
    Object.assign(b, tag);
    pairId += 1;
  });
  return turns;
}
