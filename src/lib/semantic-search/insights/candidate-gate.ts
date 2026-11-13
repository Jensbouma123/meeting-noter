import { cueKinds } from './cues';
import { detectLanguage, tokens } from './language';
import { MIN_WORDS } from './thresholds';
import type { InsightKind } from './types/insight-kind';

const COMPLETE = /^[\p{Lu}\p{N}][\s\S]*[.!]["')\]]?$/u;

export function candidateKinds(text: string): InsightKind[] {
  const trimmed = text.trim();
  if (!COMPLETE.test(trimmed) || trimmed.endsWith('...') || tokens(trimmed).length < MIN_WORDS) return [];
  if (detectLanguage(trimmed) === null) return [];
  return cueKinds(trimmed);
}
