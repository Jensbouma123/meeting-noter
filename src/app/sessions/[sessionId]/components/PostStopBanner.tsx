import { Alert, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { fillTemplate } from '../fillTemplate';
import type { PostStopBannerProps } from './PostStopBanner.types';

export function PostStopBanner({ message, postStop, detail }: PostStopBannerProps) {
  const t = useT('meeting');
  const transcribing = postStop?.phase === 'transcribing';
  const percent = postStop?.percent ?? null;

  return (
    <Alert variant="info" layout="banner" role="status" title={t('postStopTitle')} className="rounded-none max-sm:[&_p]:line-clamp-2">
      <VStack spacing="xs" className="w-full">
        <Text as="span" size="xs" variant="muted">{message}.</Text>
        {transcribing && (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevation-2">
              {percent === null ? (
                <div
                  className="h-full w-full rounded-full bg-primary-500/40 motion-safe:animate-pulse"
                  role="progressbar"
                  aria-label={t('transcribingLabel')}
                />
              ) : (
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${percent}%` }}
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('transcribingLabel')}
                />
              )}
            </div>
            {detail && (
              <Text as="span" size="xs" variant="muted" className="tabular-nums">
                {t('transcribing')}{percent === null ? '' : ` ${percent}%`}
                {` · ${detail}`}
              </Text>
            )}
          </>
        )}
        {postStop?.phase === 'done' && (
          <Text as="span" size="xs" variant="muted">{detail}</Text>
        )}
        {postStop?.phase === 'error' && (
          <Text as="span" size="xs" variant="danger">{detail}</Text>
        )}
        {postStop !== null && postStop.droppedSeconds > 0 && (
          <Text as="span" size="xs" variant="muted">
            {fillTemplate(t('dropped'), { s: Math.round(postStop.droppedSeconds) })}
          </Text>
        )}
      </VStack>
    </Alert>
  );
}
