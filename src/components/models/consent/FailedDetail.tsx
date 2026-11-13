import { Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { translatedDownloadError } from '../preparation/downloadError';

export function FailedDetail({ error }: { error: string }) {
  const t = useT('models');
  const { summary, filename } = translatedDownloadError(error, t);
  return (
    <VStack spacing="none">
      <Text size="sm" variant="danger">
        {t('error.download')}
      </Text>
      <Text size="xs" variant="muted">
        {summary}
      </Text>
      {filename && (
        <Text size="xs" variant="subtle" font="mono" className="break-all">
          {filename}
        </Text>
      )}
    </VStack>
  );
}
