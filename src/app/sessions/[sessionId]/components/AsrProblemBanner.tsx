import { Alert, Button } from '@jensbouma123/acciva-ui';
import { MicOff } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { AsrProblemBannerProps } from './AsrProblemBanner.types';

export function AsrProblemBanner({ problem, asrPhase, onDownloadModel, onOpenSettings }: AsrProblemBannerProps) {
  const t = useT('meeting');
  const blocked = asrPhase === 'blocked';
  return (
    <Alert
      variant="warning"
      layout="banner"
      role="status"
      title={t('notTranscribingTitle')}
      icon={<MicOff className="size-5" />}
      action={
        <Button
          size={{ base: 'md', md: 'sm' }}
          variant="secondary"
          onClick={() => (blocked ? onDownloadModel() : onOpenSettings('advanced'))}
        >
          {blocked ? t('downloadModel') : t('openSettings')}
        </Button>
      }
      className="rounded-none max-sm:[&_p]:line-clamp-2"
    >
      {problem} {t('stillRecording')}
    </Alert>
  );
}
