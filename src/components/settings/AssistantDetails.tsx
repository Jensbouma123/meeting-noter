'use client';

import { ChevronRight } from 'lucide-react';
import { Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

export function AssistantDetails({ configPath, manualCommand }: { configPath: string | null; manualCommand: string | null }) {
  const t = useT('assistant');
  return (
    <details className="group pt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-3 shrink-0 transition-transform group-open:rotate-90" />
        {t('details')}
      </summary>
      <div className="mt-2 flex flex-col gap-1">
        {configPath && <Text size="xs" variant="muted" font="mono" className="break-all">{configPath}</Text>}
        {manualCommand && <Text size="xs" variant="muted" font="mono" className="break-all">{manualCommand}</Text>}
      </div>
    </details>
  );
}
