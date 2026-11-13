import { Download } from 'lucide-react';
import { Button, Card, HStack, Text, VStack } from '@jensbouma123/acciva-ui';
import { openDialog } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';
import { isPreparing } from '../preparation/describePreparation';
import { BackendBadge } from './BackendBadge';
import { FailedRow } from './FailedRow';
import { ProgressRow } from './ProgressRow';
import { StatusBadge } from './StatusBadge';
import { StatusIcon } from './StatusIcon';
import { useModelCopy } from './useModelCopy';
import type { ModelStatusRowProps } from './types';

export function ModelStatusRow({ entry, preparation }: ModelStatusRowProps) {
  const t = useT('models');
  const isAsr = (entry.kind ?? 'asr') === 'asr';
  const showBackend = isAsr || entry.kind === 'search';
  const copy = useModelCopy(entry);
  const preparing = isPreparing(preparation) && isAsr;
  return (
    <Card variant="bordered" padding="md" className="w-full">
      <VStack spacing="sm" className="w-full">
        <HStack spacing="sm" justify="between" align="center" wrap>
          <HStack spacing="sm" className="min-w-0">
            <StatusIcon status={entry.status} preparing={preparing} />
            <Text weight="semibold" size="sm" truncate>
              {copy.name}
            </Text>
          </HStack>
          <HStack spacing="xs" className="shrink-0">
            {showBackend && <BackendBadge backend={entry.backend} />}
            <StatusBadge status={preparing ? 'downloading' : entry.status} />
          </HStack>
        </HStack>

        {copy.description && entry.status !== 'failed' && !preparing && (
          <Text size="xs" variant="muted">
            {copy.description}
          </Text>
        )}

        {entry.status === 'downloading' && <ProgressRow entry={entry} />}

        {entry.status === 'failed' && <FailedRow entry={entry} />}

        {(entry.status === 'not-downloaded' || entry.status === 'cancelled') && (
          <Button
            variant="outline"
            size={{ base: 'md', md: 'sm' }}
            leadingIcon={<Download className="size-3.5" />}
            onClick={openDialog}
            className="max-sm:w-full"
          >
            {t('action.download')}
          </Button>
        )}

        {entry.status === 'unavailable' && entry.error && (
          <Text size="xs" variant="muted">
            {entry.error}
          </Text>
        )}
      </VStack>
    </Card>
  );
}
