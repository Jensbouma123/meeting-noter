'use client';

import { Circle, Info, Mic } from 'lucide-react';
import { Button, EmptyState, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { TranscriptEmptyStateProps } from './LiveTranscript.types';

export function TranscriptEmptyState({ modelReady, modelReadiness, onStartRecording, onOpenSettings }: TranscriptEmptyStateProps) {
  const t = useT('transcript');
  const preparing = modelReadiness === 'loading' || modelReadiness === 'downloading';
  const failed = modelReadiness === 'failed';
  const emptyTitle = preparing ? t('speechPreparing') : failed ? t('speechFailed') : t('speechMissing');
  const emptyBody = preparing
    ? t('speechPreparingDescription')
    : failed
      ? t('speechFailedDescription')
      : t('speechMissingDescription');

  return (
    <div
      role="region"
      aria-label={t('transcriptLabel')}
      className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 md:px-8"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <EmptyState
          size="md"
          icon={<Mic className="size-6" aria-hidden="true" />}
          title={modelReady ? t('ready') : emptyTitle}
          description={modelReady ? t('readyDescription') : emptyBody}
          action={
            modelReady ? (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size={{ base: 'md', md: 'sm' }}
                  onClick={onStartRecording}
                  leadingIcon={<Circle className="size-3 fill-current" aria-hidden="true" />}
                >
                  {t('record')}
                </Button>
                <Text size="xs" variant="muted">
                  {t('orPress')}{' '}
                  <kbd className="rounded border border-border-soft px-1.5 font-mono text-[0.7rem] text-muted-foreground">R</kbd>
                </Text>
              </div>
            ) : !preparing ? (
              <Button
                variant="secondary"
                size={{ base: 'md', md: 'sm' }}
                onClick={() => onOpenSettings('advanced')}
              >
                {failed ? t('openSettings') : t('setupModel')}
              </Button>
            ) : undefined
          }
        />
        <div className="flex w-fit max-w-full items-start gap-2 rounded-lg border border-border-soft bg-muted/40 px-3 py-2 text-left">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Text size="xs" variant="muted">
            {t('callTip')}
          </Text>
        </div>
      </div>
    </div>
  );
}
