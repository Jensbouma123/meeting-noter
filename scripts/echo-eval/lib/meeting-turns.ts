import type { MeetingPairing, MeetingSpeaker, MeetingTurn } from '../types/meeting-case';
import type { UttPick, UttPool } from '../types/utt-pick';
import { uniform } from './rng';

export const BACKCHANNEL_SEC = 0.7;
const TARGET_MIN = 120;
const TARGET_MAX = 230;
const FRAC_BINS = [0.1, 0.4, 0.7];


const pickOf = (rng: () => number, pool: UttPool, speaker: string): UttPick => {
  const list = pool.get(speaker)!;
  return list[Math.floor(rng() * list.length)];
};

const choose = <T>(rng: () => number, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

function turn(s: MeetingSpeaker, u: UttPick, start: number, event: MeetingTurn['event']): MeetingTurn {
  return {
    utt: u.id,
    speaker: s.id,
    role: s.role,
    lang: s.lang,
    event,
    startSec: +start.toFixed(2),
    endSec: +(start + u.seconds).toFixed(2),
    clipSec: null,
    pairId: null,
    pairing: null,
    overlapFrac: null,
  };
}

function partners(rng: () => number, speakers: MeetingSpeaker[], pairing: MeetingPairing): [MeetingSpeaker, MeetingSpeaker] {
  const locals = speakers.filter((s) => s.role === 'local');
  const remotes = speakers.filter((s) => s.role === 'remote');
  if (pairing === 'local+local') return [locals[0], locals[1]];
  if (pairing === 'remote+remote') {
    const a = choose(rng, remotes);
    return [a, choose(rng, remotes.filter((s) => s.id !== a.id))];
  }
  const pair: [MeetingSpeaker, MeetingSpeaker] = [choose(rng, locals), choose(rng, remotes)];
  return rng() < 0.5 ? pair : [pair[1], pair[0]];
}

function overlapBlock(rng: () => number, speakers: MeetingSpeaker[], pool: UttPool, start: number, k: number, pairing: MeetingPairing, bin: number): MeetingTurn[] {
  const [sa, sb] = partners(rng, speakers, pairing);
  const a = turn(sa, pickOf(rng, pool, sa.id), start, 'turn');
  const ub = pickOf(rng, pool, sb.id);
  const frac = +(FRAC_BINS[bin % 3] + uniform(rng, 0, 0.3)).toFixed(2);
  const shorter = Math.min(a.endSec - a.startSec, ub.seconds);
  const b = turn(sb, ub, a.endSec - Math.min(1, frac) * shorter, 'interrupt');
  const tag = { pairId: k, pairing, overlapFrac: Math.min(1, frac) };
  return [{ ...a, ...tag }, { ...b, ...tag }];
}

function backchannel(rng: () => number, speakers: MeetingSpeaker[], pool: UttPool, last: MeetingTurn): MeetingTurn {
  const s = choose(rng, speakers.filter((x) => x.id !== last.speaker));
  const u = pickOf(rng, pool, s.id);
  const start = Math.max(last.startSec, last.endSec - uniform(rng, 0, 1.5));
  return { ...turn(s, u, start, 'backchannel'), endSec: +(start + BACKCHANNEL_SEC).toFixed(2), clipSec: BACKCHANNEL_SEC };
}

export function buildTurns(rng: () => number, speakers: MeetingSpeaker[], pool: UttPool): MeetingTurn[] {
  const pairings: MeetingPairing[] = ['remote+remote', 'local+remote', ...(speakers.filter((s) => s.role === 'local').length > 1 ? (['local+local'] as const) : [])];
  const target = uniform(rng, TARGET_MIN, TARGET_MAX);
  const turns: MeetingTurn[] = [];
  let cursor = uniform(rng, 0.3, 1);
  let k = 0;
  let last: MeetingTurn | null = null;
  while (cursor < target) {
    const r = rng();
    let added: MeetingTurn[];
    if (last && r < 0.12) added = [backchannel(rng, speakers, pool, last)];
    else if (r < 0.4) {
      const pairing = pairings[k % pairings.length];
      added = overlapBlock(rng, speakers, pool, cursor, k, pairing, Math.floor(k / pairings.length));
      k += 1;
    } else {
      const s = choose(rng, speakers.filter((x) => x.id !== last?.speaker));
      added = [turn(s, pickOf(rng, pool, s.id), cursor, 'turn')];
    }
    turns.push(...added);
    const real = added.filter((t) => t.event !== 'backchannel');
    if (real.length) {
      last = real.reduce((a, b) => (b.endSec >= a.endSec ? b : a));
      cursor = last.endSec + uniform(rng, 0.3, 1.6);
    }
  }
  return turns.sort((a, b) => a.startSec - b.startSec);
}
