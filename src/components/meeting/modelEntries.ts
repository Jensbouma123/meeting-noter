import type { ModelEntry } from '@/lib/asr/browser';

export function asrModelEntry(entries: ModelEntry[]): ModelEntry | undefined {
  return entries.find((e) => (e.kind ?? 'asr') === 'asr');
}
