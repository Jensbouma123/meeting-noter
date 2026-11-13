import { Text, VStack } from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { formatBytes, formatSeconds, type ModelEntry } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';

export function ProgressRow({ entry }: { entry: ModelEntry }) {
  const t = useT('models');
  const { progress } = entry;
  const etaText =
    progress.etaSeconds > 0 && !isNaN(progress.etaSeconds)
      ? ` · ${formatSeconds(progress.etaSeconds)} left`
      : '';

  if (progress.resuming) {
    return (
      <VStack spacing="xs" className="w-full">
        <ProgressTrack value={null} label={t('progress.resuming')} />
        <Text size="xs" variant="muted" font="mono">
          {t('progress.resumingText').replace('{bytes}', formatBytes(progress.loadedBytes))}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing="xs" className="w-full">
      <ProgressTrack value={progress.percent} label={t('progress.download')} />
      <Text size="xs" variant="muted" font="mono" className="tabular-nums">
        {formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)} ·{' '}
        {progress.percent}%{etaText}
      </Text>
    </VStack>
  );
}
