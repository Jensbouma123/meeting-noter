import { HStack, Text, VStack } from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { formatBytes, formatSeconds, type ModelProgress } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';

export function DownloadProgressBar({ progress }: { progress: ModelProgress }) {
  const t = useT('models');
  const throughputText =
    progress.throughputBytesPerSec > 0
      ? ` · ${formatBytes(progress.throughputBytesPerSec)}/s`
      : '';

  const etaText =
    progress.etaSeconds > 0 && !isNaN(progress.etaSeconds)
      ? ` · ${formatSeconds(progress.etaSeconds)} left`
      : '';

  return (
    <VStack spacing="xs" className="w-full">
      <ProgressTrack value={progress.percent} label={t('progress.download')} />
      <HStack spacing="xs" wrap>
        <Text size="xs" variant="muted" font="mono" className="tabular-nums">
          {formatBytes(progress.loadedBytes)} of {formatBytes(progress.totalBytes)}
        </Text>
        {throughputText && (
          <Text size="xs" variant="subtle" font="mono">
            {throughputText}
          </Text>
        )}
        {etaText && (
          <Text size="xs" variant="subtle" font="mono">
            {etaText}
          </Text>
        )}
        <Text size="xs" weight="semibold" variant="primary">
          {progress.percent}%
        </Text>
      </HStack>
    </VStack>
  );
}
