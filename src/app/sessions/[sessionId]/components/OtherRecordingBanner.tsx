import { Alert } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { getSessionMetadata } from '@/lib/meeting/session-store';
import { fillTemplate } from '../fillTemplate';

export function OtherRecordingBanner() {
  const t = useT('meeting');
  return (
    <Alert
      variant="warning"
      layout="banner"
      role="status"
      title={t('otherTitle')}
      className="rounded-none max-sm:[&_p]:line-clamp-2"
    >
      {fillTemplate(t('otherBody'), {
        title: getSessionMetadata(getTranscriptSessionId() ?? '')?.title ?? t('otherFallback'),
      })}
    </Alert>
  );
}
