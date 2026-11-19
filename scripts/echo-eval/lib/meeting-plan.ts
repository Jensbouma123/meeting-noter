import type { MeetingCase, MeetingLang } from '../types/meeting-case';
import type { Utterance } from '../types/utterance';
import { drawBleedParams } from './draw-bleed';
import type { UttPick } from '../types/utt-pick';
import { buildTurns } from './meeting-turns';
import { chooseSpeakers, isCorpusUtt, speakerPools } from './meeting-speakers';
import { hashString, makeRng } from './rng';

export const MEETINGS_PER_SPLIT = 36;
const LANGS: MeetingLang[] = ['nl', 'nl', 'nl', 'en', 'en', 'mixed'];
const SIZES = [4, 5, 6];

export function buildMeetings(utts: Utterance[], seed = 20261120): MeetingCase[] {
  const corpus = utts.filter(isCorpusUtt);
  const pool = new Map<string, UttPick[]>();
  for (const u of corpus) pool.set(u.speaker, [...(pool.get(u.speaker) ?? []), { id: u.id, seconds: u.seconds }]);
  const out: MeetingCase[] = [];
  for (const split of ['dev', 'heldout'] as const) {
    const pools = speakerPools(corpus, split);
    for (let i = 0; i < MEETINGS_PER_SPLIT; i += 1) {
      const id = `meet-${split}-${i}`;
      const rng = makeRng(seed + hashString(id));
      const lang = LANGS[i % LANGS.length];
      const speakers = chooseSpeakers(pools, lang, SIZES[Math.floor(i / 2) % SIZES.length], 1 + (i % 2), seed + i + (split === 'dev' ? 0 : 1000));
      const turns = buildTurns(rng, speakers, pool);
      const durationSec = Math.max(...turns.map((t) => t.endSec));
      out.push({ id, split, lang, speakers, bleed: drawBleedParams(rng), turns, durationSec });
    }
  }
  return out;
}
