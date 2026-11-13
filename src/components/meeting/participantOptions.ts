import { uniqueNames } from '@/lib/meeting/participants';
import type { ParticipantOption } from './ParticipantsEditor.types';

export function buildParticipantOptions(
  names: string[],
  knownCandidates: string[],
  draft: string,
): { options: ParticipantOption[]; matches: string[] } {
  const taken = new Set(names.map((n) => n.toLowerCase()));
  const known = uniqueNames(knownCandidates).filter((name) => !taken.has(name.toLowerCase()));
  const query = draft.trim().toLowerCase();
  const matches = query ? known.filter((name) => name.toLowerCase().includes(query)) : known;
  const exactMatch = query && known.some((name) => name.toLowerCase() === query);
  const options = [
    ...matches.map((name) => ({ name, addNew: false })),
    ...(query && !exactMatch ? [{ name: draft.trim().replace(/\s+/g, ' ').slice(0, 40), addNew: true }] : []),
  ];
  return { options, matches };
}
