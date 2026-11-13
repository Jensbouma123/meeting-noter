import { uniqueNames } from '@/lib/meeting/participant-names';
import { filterPeople, newPersonName } from './participantList';
import type { ParticipantOption } from './ParticipantOption.types';

export function pickerSections(
  people: readonly string[],
  roster: readonly string[],
  query: string,
): { usual: ParticipantOption[]; others: ParticipantOption[]; fresh: string | null } {
  const all = uniqueNames([...roster, ...people]);
  const rosterKeys = new Set(roster.map((name) => name.toLowerCase()));
  const visible = filterPeople(all, query);
  const usual = visible.filter((name) => rosterKeys.has(name.toLowerCase())).map((name) => ({ name, addNew: false }));
  const others = visible.filter((name) => !rosterKeys.has(name.toLowerCase())).map((name) => ({ name, addNew: false }));
  return { usual, others, fresh: newPersonName(all, query) };
}
