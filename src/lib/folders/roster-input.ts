import { uniqueNames } from '@/lib/meeting/participant-names';

const MAX_ROSTER_NAMES = 200;

export function normalizeRoster(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_ROSTER_NAMES) return null;
  if (input.some((item) => typeof item !== 'string')) return null;
  return uniqueNames((input as string[]).map((name) => name.slice(0, 40)));
}
