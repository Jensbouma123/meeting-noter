import { Text } from '@jensbouma123/acciva-ui';
import { SpeakerAssign } from './SpeakerAssign';
import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import { COLUMN_WITHOUT_LINE_RULE } from './transcriptItems';
import type { OverlapColumnProps } from './OverlapColumn.types';

export function OverlapColumn({ speakerId, segs, speakers, sessionId, style }: OverlapColumnProps) {
  const { label, colorIndex, color } = style;
  const otherLabels = Object.values(speakers)
    .filter((sp) => sp.id !== speakerId)
    .map((sp) => sp.label);

  return (
    <div data-overlap-speaker={speakerId} className={`relative min-w-0 sm:pl-3 ${COLUMN_WITHOUT_LINE_RULE}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0 hidden w-0.5 rounded-full sm:block ${color.dotClass}`}
      />
      <span className="flex min-w-0 items-baseline gap-1.5 select-none">
        <span
          className={`inline-block size-2 shrink-0 self-center rounded-full ${color.dotClass}`}
          aria-hidden="true"
        />
        {sessionId ? (
          <SpeakerAssign
            sessionId={sessionId}
            speakerId={speakerId}
            label={label}
            source={segs[0].source}
            otherLabels={otherLabels}
            textClassName={`text-sm font-semibold ${color.textClass}`}
          />
        ) : (
          <Text as="span" size="sm" weight="semibold" className={`truncate ${color.textClass}`}>
            {label}
          </Text>
        )}
      </span>
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
  );
}
