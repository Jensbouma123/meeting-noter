import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { TRANSCRIPT_GUTTER_CLASS } from './transcriptGutter';

export function TranscriptGutterTime({ start }: { start: number }) {
  return (
    <Text
      as="span"
      size="xs"
      variant="muted"
      font="mono"
      data-speaker-time=""
      className={`${TRANSCRIPT_GUTTER_CLASS} text-[0.625rem] tabular-nums select-none md:text-xs`}
    >
      {formatClock(start)}
    </Text>
  );
}
