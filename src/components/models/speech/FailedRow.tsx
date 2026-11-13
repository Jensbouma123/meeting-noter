import { Button, HStack, Text, VStack } from '@jensbouma123/acciva-ui';
import { retryDownload, type ModelEntry } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';
import { translatedDownloadError } from '../preparation/downloadError';

export function FailedRow({ entry }: { entry: ModelEntry }) {
  const t = useT('models');
  const { summary, filename } = translatedDownloadError(entry.error, t);

  return (
    <HStack spacing="sm" justify="between" align="center" wrap className="w-full">
      <VStack spacing="none" className="min-w-0">
        <Text size="xs" variant="danger">
          {summary}
        </Text>
        {filename && (
          <Text size="xs" variant="muted" font="mono">
            {filename}
          </Text>
        )}
      </VStack>
      <Button variant="outline" size="xs" onClick={() => void retryDownload(entry.key)} className="shrink-0">
        {t('action.retry')}
      </Button>
    </HStack>
  );
}
