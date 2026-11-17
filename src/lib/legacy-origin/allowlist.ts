import { LIMITS, MIGRATABLE_KEYS, MIGRATABLE_PATTERNS } from './constants';

const PATTERNS = MIGRATABLE_PATTERNS.map((p) => new RegExp(p));

export function isMigratableKey(key: unknown): key is string {
  if (typeof key !== 'string' || key.length > LIMITS.maxKeyChars) return false;
  return MIGRATABLE_KEYS.includes(key) || PATTERNS.some((p) => p.test(key));
}
