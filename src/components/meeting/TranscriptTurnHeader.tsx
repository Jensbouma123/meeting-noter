import { Badge, HStack, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { getSpeakerColor } from './speaker-theme';
import { formatTimestamp } from './transcriptTurnFormat';
import type { TranscriptTurnHeaderProps } from './TranscriptTurnHeader.types';

export function TranscriptTurnHeader({
  segment,
  speakerLabel,
  speakerColorIndex,
}: TranscriptTurnHeaderProps) {
  const t = useT('transcript');
  const colorStyle = getSpeakerColor(speakerColorIndex);
  const isFinal = segment.final;

  return (
    <HStack spacing="sm" align="center" className="select-none">
      <span className={`size-2.5 shrink-0 rounded-full ${colorStyle.dotClass}`} aria-hidden="true" />
      <Text as="span" size="sm" weight="semibold" className={`${colorStyle.textClass} transition-opacity ${isFinal ? '' : 'opacity-70'}`}>
        {speakerLabel}
      </Text>
      <Text as="span" size="xs" variant="muted" font="mono" className="tabular-nums">
        {formatTimestamp(segment.start)}
      </Text>
      <Badge variant="neutral" size="xxs">
        {segment.source === 'mic' ? t('mic') : t('call')}
      </Badge>
      {!isFinal && (
        <Badge variant="primary" size="xxs" dot>
          {t('listening')}
        </Badge>
      )}
    </HStack>
  );
}
