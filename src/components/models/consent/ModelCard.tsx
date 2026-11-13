import { Badge, Card, HStack, Text, VStack } from '@jensbouma123/acciva-ui';
import { formatBytes } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';
import { CONSENT_STATUS_BADGE } from './constants';
import { DownloadProgressBar } from './DownloadProgressBar';
import { FailedDetail } from './FailedDetail';
import { StatusIcon } from './StatusIcon';
import type { ModelCardProps } from './types';

export function ModelCard({ entry }: ModelCardProps) {
  const t = useT('models');
  const showPill = entry.status === 'failed' && !entry.error;
  const showSize = entry.status === 'not-downloaded';
  const badge = showPill ? CONSENT_STATUS_BADGE[entry.status] : null;

  return (
    <Card variant="bordered" padding="md" className="w-full">
      <VStack spacing="sm" className="w-full">
        <HStack spacing="sm" justify="between">
          <HStack spacing="sm" className="min-w-0">
            <StatusIcon status={entry.status} />
            <Text weight="semibold" size="sm" truncate>
              {entry.displayName}
            </Text>
          </HStack>

          <HStack spacing="xs" className="shrink-0">
            {badge && (
              <Badge variant={badge.variant} size="sm" dot>
                {t(`badge.${entry.status}`)}
              </Badge>
            )}
            {showSize && (
              <Text size="xs" variant="muted" font="mono">
                {formatBytes(entry.estimatedSizeBytes)}
              </Text>
            )}
          </HStack>
        </HStack>

        {entry.status === 'not-downloaded' && entry.description && (
          <Text size="xs" variant="muted">
            {entry.description}
          </Text>
        )}

        {entry.status === 'downloading' && <DownloadProgressBar progress={entry.progress} />}

        {entry.status === 'failed' && entry.error && <FailedDetail error={entry.error} />}

        {entry.status === 'cancelled' && (
          <Text size="sm" variant="muted">
            {t('error.cancelled')}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
