import { CheckCircle2, Download } from 'lucide-react';
import { Button, Text, VStack } from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { useT } from '@/lib/i18n/useT';
import { fillTemplate } from './fillTemplate';
import type { OnboardingModels } from './types';

export function ModelsStep({ models }: { models: OnboardingModels }) {
  const t = useT('onboarding');
  const { list, modelsReady, downloading, failed, percent, sizeText, startDownload } = models;
  return (
    <VStack spacing="sm" className="w-full">
      {modelsReady ? (
        <div className="flex items-center gap-2" role="status">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          <Text size="sm">{t('models.ready')}</Text>
        </div>
      ) : (
        <>
          <Text size="sm">{fillTemplate(t('models.body'), { size: sizeText })}</Text>
          {downloading.length > 0 && (
            <VStack spacing="xs" className="w-full">
              <ProgressTrack value={percent} label={t('models.downloading')} />
              <Text size="xs" variant="muted" role="status">
                {t('models.downloading')} {percent}%
              </Text>
            </VStack>
          )}
          {failed && (
            <Text size="sm" variant="danger" role="alert">
              {t('models.failed')}
            </Text>
          )}
          {downloading.length === 0 && (
            <div>
              <Button
                variant="primary"
                size={{ base: 'md', md: 'sm' }}
                leadingIcon={<Download className="size-4" />}
                disabled={list.length === 0}
                onClick={startDownload}
              >
                {failed ? t('models.retry') : fillTemplate(t('models.download'), { size: sizeText })}
              </Button>
            </div>
          )}
        </>
      )}
    </VStack>
  );
}
