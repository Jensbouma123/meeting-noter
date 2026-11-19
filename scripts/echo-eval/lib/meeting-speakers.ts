import type { MeetingLang, MeetingSpeaker } from '../types/meeting-case';
import type { Utterance } from '../types/utterance';
import { langOf } from './factors';
import { hashString, makeRng } from './rng';

export const isCorpusUtt = (u: Utterance): boolean => /^(nl|en)-/.test(u.id);
export const speakerSplit = (speaker: string): 'dev' | 'heldout' => (hashString(speaker) % 2 === 0 ? 'dev' : 'heldout');

export function speakerPools(utts: Utterance[], split: 'dev' | 'heldout'): Record<'nl' | 'en', string[]> {
  const pools: Record<'nl' | 'en', Set<string>> = { nl: new Set(), en: new Set() };
  for (const u of utts) if (isCorpusUtt(u) && speakerSplit(u.speaker) === split) pools[langOf(u.id)!].add(u.speaker);
  return { nl: [...pools.nl].sort(), en: [...pools.en].sort() };
}

function draw<T>(rng: () => number, from: T[], n: number): T[] {
  const left = [...from];
  const out: T[] = [];
  for (let i = 0; i < n && left.length; i += 1) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return out;
}

export function chooseSpeakers(
  pools: Record<'nl' | 'en', string[]>,
  lang: MeetingLang,
  count: number,
  locals: number,
  seed: number,
): MeetingSpeaker[] {
  const rng = makeRng(seed);
  const nlCount = lang === 'nl' ? count : lang === 'en' ? 0 : Math.ceil(count / 2);
  const picked = [
    ...draw(rng, pools.nl, nlCount).map((id) => ({ id, lang: 'nl' as const })),
    ...draw(rng, pools.en, count - nlCount).map((id) => ({ id, lang: 'en' as const })),
  ];
  const order = draw(rng, picked, picked.length);
  return order.map((s, i) => ({ ...s, role: i < locals ? ('local' as const) : ('remote' as const) }));
}
