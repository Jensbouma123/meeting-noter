'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { useT } from '@/lib/i18n/useT';
import { TranscriptPendingSpeaker } from './TranscriptPendingSpeaker';
import { TranscriptSpeakerName } from './TranscriptSpeakerName';
import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptLineRowProps } from './LiveTranscript.types';

export function TranscriptLineRow({
  item,
  index,
  isLast,
  rowClass,
  sessionId,
  speakers,
  flash,
}: TranscriptLineRowProps) {
  const t = useT('transcript');
  const speakerStyle = useSpeakerStyle(speakers);
  const { seg, turnStart, showTime } = item;
  const style = speakerStyle(seg.speaker, seg.source);
  const sourceLabel = seg.source === 'mic' ? t('mic') : t('call');
  const gap = index === 0 ? '' : turnStart ? 'pt-5' : showTime ? 'pt-3' : '';

  return (
    <div
      ref={flash?.ref}
      className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${isLast ? 'pb-40' : ''} ${flash?.className ?? ''}`}
    >
      <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
        <div
          data-speaker={seg.speaker}
          data-turn-start={turnStart ? '' : undefined}
          className={`${rowClass} ${gap} pb-0.5`}
        >
          <Text as="span" size="xs" variant="muted" font="mono" className="select-none text-right tabular-nums">
            {showTime ? formatClock(seg.start) : ''}
          </Text>
          {!turnStart ? (
            <span aria-hidden="true" />
          ) : seg.unconfirmed ? (
            <TranscriptPendingSpeaker />
          ) : (
            <span className="flex min-w-0 items-baseline select-none" title={`${style.label} · ${sourceLabel}`}>
              <TranscriptSpeakerName
                sessionId={sessionId}
                speakerId={seg.speaker}
                source={seg.source}
                speakers={speakers}
                style={style}
              />
              <span className="sr-only">({sourceLabel})</span>
            </span>
          )}
          <div data-seg-id={seg.id} className="min-w-0">
            <TranscriptTurn
              actions={buildTurnActions(sessionId, seg)}
              segment={seg}
              speakerLabel={style.label}
              speakerColorIndex={style.colorIndex}
              showHeader={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
