import type { Segment } from './types';
import type { NoteSuggestion } from './types/notes';

const MIN_SUGGESTION_WORDS = 5;
const ACTION_CUES = [
  'actiepunt', 'ik pak', 'wie doet', 'graag', 'deadline', 'action item', "i'll",
];
const DECISION_CUES = ['we besluiten', 'afgesproken', 'decided', 'agreed'];

export function suggestFromSegments(segments: readonly Segment[], lang?: string): NoteSuggestion[] {
  const language = lang?.toLowerCase().split(/[-_]/)[0];
  if (language && language !== 'nl' && language !== 'en') return [];
  const suggestions: NoteSuggestion[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    const text = segment.text.trim();
    if (text.split(/\s+/).length < MIN_SUGGESTION_WORDS) continue;
    const normalized = text.toLocaleLowerCase();
    const kind = DECISION_CUES.some((cue) => normalized.includes(cue))
      ? 'decision'
      : ACTION_CUES.some((cue) => normalized.includes(cue)) ? 'action' : null;
    if (kind && !seen.has(normalized)) {
      seen.add(normalized);
      suggestions.push({ text, sourceSegmentId: segment.id, kind });
    }
  }
  return suggestions;
}
