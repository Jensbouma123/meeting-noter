import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import type { TranscriptSpeakerHeaderProps } from './TranscriptSpeakerHeader.types';

export function TranscriptSpeakerHeader({ dotClass, start, title, children }: TranscriptSpeakerHeaderProps) {
  return (
    <div data-speaker-header="" className="flex min-w-0 items-baseline gap-2 select-none" title={title}>
      <span className={`inline-block size-1.5 shrink-0 -translate-y-0.5 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className="flex min-w-0 items-baseline gap-1.5">{children}</span>
      <Text as="span" size="xs" variant="muted" font="mono" data-speaker-time="" className="shrink-0 tabular-nums">
        {formatClock(start)}
      </Text>
    </div>
  );
}
