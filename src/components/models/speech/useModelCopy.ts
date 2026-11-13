import { formatBytes, type ModelEntry } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';

export function useModelCopy(entry: ModelEntry): { name: string; description: string | undefined } {
  const t = useT('models');
  if (entry.kind !== 'search') return { name: entry.displayName, description: entry.description };
  const size = entry.status === 'cached' ? '' : ` (${formatBytes(entry.estimatedSizeBytes)})`;
  return { name: t('model.search.name'), description: t('model.search.description') + size };
}
