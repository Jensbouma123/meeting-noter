import type { ModelEntry } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';

export function useModelCopy(entry: ModelEntry): { name: string; description: string | undefined } {
  const t = useT('models');
  if (entry.kind !== 'search') return { name: entry.displayName, description: entry.description };
  const megabytes = Math.round(entry.estimatedSizeBytes / 1_000_000);
  const size = entry.status === 'cached' ? '' : ' ' + t('model.search.size').replace('{size}', String(megabytes));
  return { name: t('model.search.name'), description: t('model.search.description') + size };
}
