import { uniqueNames } from '@/lib/meeting/participant-names';

export function cleanName(draft: string): string {
  return draft.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function knownPeople(...sources: string[][]): string[] {
  return uniqueNames(sources.flat());
}

export function filterPeople(people: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  return q ? people.filter((name) => name.toLowerCase().includes(q)) : people;
}

export function newPersonName(people: string[], query: string): string | null {
  const name = cleanName(query);
  if (!name) return null;
  const key = name.toLowerCase();
  return people.some((p) => p.toLowerCase() === key) ? null : name;
}
