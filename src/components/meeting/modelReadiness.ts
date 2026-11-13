import type { ModelEntry } from '@/lib/asr/browser';
import { asrModelEntry } from './modelEntries';
import type { AsrRuntimeState, ModelReadiness } from './modelReadiness.types';

function engineReadiness(asr: AsrRuntimeState): ModelReadiness {
  if (!asr.enabled) return 'ready';
  if (asr.phase === 'failed') return 'failed';
  if (asr.phase === 'blocked') return 'ready';
  if (asr.phase === 'post-stop') return 'ready';
  if (asr.phase !== 'ready') return 'loading';
  return 'ready';
}

export function deriveModelReadiness(
  entries: ModelEntry[],
  asr: AsrRuntimeState,
): ModelReadiness {
  const entry = asrModelEntry(entries);
  if (!entry) return 'not-downloaded';

  if (entry.status === 'failed' || entry.status === 'unavailable') return 'failed';
  if (entry.status === 'downloading') return 'downloading';
  if (entry.status !== 'cached') return 'not-downloaded';

  return engineReadiness(asr);
}
