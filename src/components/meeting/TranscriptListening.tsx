'use client';

import { Mic } from 'lucide-react';
import { EmptyState } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

export function TranscriptListening() {
  const t = useT('transcript');
  return (
    <div
      role="region"
      aria-label={t('transcriptLabel')}
      className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 md:px-8"
    >
      <EmptyState
        compact
        size="sm"
        icon={<Mic className="size-5" aria-hidden="true" />}
        title={t('listening')}
        description={t('listeningDescription')}
      />
    </div>
  );
}
