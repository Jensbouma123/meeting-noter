import { Text } from '@jensbouma123/acciva-ui';
import { SpeakerAssign } from './SpeakerAssign';
import type { TranscriptSpeakerNameProps } from './TranscriptSpeakerName.types';

export function TranscriptSpeakerName({ sessionId, speakerId, source, speakers, style }: TranscriptSpeakerNameProps) {
  const textClass = `text-sm font-semibold ${style.color.textClass}`;
  if (!sessionId) {
    return (
      <Text as="span" size="sm" weight="semibold" data-speaker-name="" className={`truncate ${style.color.textClass}`}>
        {style.label}
      </Text>
    );
  }
  return (
    <SpeakerAssign
      sessionId={sessionId}
      speakerId={speakerId}
      label={style.label}
      source={source}
      otherLabels={Object.values(speakers)
        .filter((sp) => sp.id !== speakerId)
        .map((sp) => sp.label)}
      textClassName={textClass}
    />
  );
}
