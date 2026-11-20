import { Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { TranscriptSpeakerHeader } from './TranscriptSpeakerHeader';
import { TranscriptSpeakerName } from './TranscriptSpeakerName';
import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import type { OverlapColumnProps } from './OverlapColumn.types';

export function OverlapColumn({ speakerId, segs, sessionId, speakers, style }: OverlapColumnProps) {
  const t = useT('transcript');
  const { label, colorIndex, color } = style;
  return (
    <div data-overlap-speaker={speakerId} className="flex min-w-0 flex-col gap-y-1">
      <TranscriptSpeakerHeader dotClass={color.dotClass} start={segs[0].start}>
        <TranscriptSpeakerName
          sessionId={sessionId}
          speakerId={speakerId}
          source={segs[0].source}
          speakers={speakers}
          style={style}
        />
        <Text as="span" size="xs" variant="muted" className="shrink-0">
          ({t('together')})
        </Text>
      </TranscriptSpeakerHeader>
      <div className="min-w-0 pl-3.5">
        {segs.map((seg) => (
          <div key={seg.id} data-seg-id={seg.id} className="min-w-0">
            <TranscriptTurn
              actions={buildTurnActions(sessionId, seg)}
              segment={seg}
              speakerLabel={label}
              speakerColorIndex={colorIndex}
              showHeader={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
