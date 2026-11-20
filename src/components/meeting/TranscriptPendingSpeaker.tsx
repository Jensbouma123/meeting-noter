import { Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

export function TranscriptPendingSpeaker() {
  const t = useT('transcript');
  return (
    <span
      data-speaker-pending=""
      role="status"
      aria-label={t('pendingSpeaker')}
      title={t('pendingSpeaker')}
      className="flex min-w-0 items-baseline gap-1.5 select-none"
    >
      <span className="inline-flex shrink-0 gap-0.5 self-center" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1 animate-pulse rounded-full bg-text-muted motion-reduce:animate-none"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </span>
      <Text as="span" size="sm" variant="muted" className="truncate">
        {t('identifying')}
      </Text>
    </span>
  );
}
