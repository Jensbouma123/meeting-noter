import { isMigratableKey } from './allowlist';
import { EXPORT_TYPE, LIMITS, PROTOCOL_VERSION } from './constants';
import { legacyOrigins } from './origins';
import type { LegacyEntry, LegacyMessage } from './types';

export function parseExportMessage(
  message: LegacyMessage,
  allowed: readonly string[] = legacyOrigins(),
): LegacyEntry[] | null {
  if (!allowed.includes(message.origin)) return null;
  const data = message.data as { type?: unknown; version?: unknown; entries?: unknown } | null;
  if (!data || typeof data !== 'object' || data.type !== EXPORT_TYPE || data.version !== PROTOCOL_VERSION) return null;
  if (!Array.isArray(data.entries) || data.entries.length > LIMITS.maxEntries) return null;
  const entries: LegacyEntry[] = [];
  let total = 0;
  for (const entry of data.entries as unknown[]) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [key, value] = entry as unknown[];
    if (!isMigratableKey(key) || typeof value !== 'string' || value.length > LIMITS.maxValueChars) return null;
    total += value.length;
    if (total > LIMITS.maxTotalChars) return null;
    entries.push([key, value]);
  }
  return entries;
}
