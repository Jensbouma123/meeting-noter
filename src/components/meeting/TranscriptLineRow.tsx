'use client';

import { useT } from '@/lib/i18n/useT';
import { TranscriptPendingSpeaker } from './TranscriptPendingSpeaker';
import { TranscriptSpeakerHeader } from './TranscriptSpeakerHeader';
import { TranscriptSpeakerName } from './TranscriptSpeakerName';
import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptLineRowProps } from './LiveTranscript.types';

export function TranscriptLineRow({ item, index, isLast, sessionId, speakers, flash }: TranscriptLineRowProps) {
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
      <div className="mx-auto w-full max-w-[calc(72ch+1rem)]">
        <div
          data-speaker={seg.speaker}
          data-turn-start={turnStart ? '' : undefined}
          className={`flex flex-col gap-y-1 ${gap} pb-0.5`}
        >
          {turnStart && (
            <TranscriptSpeakerHeader
              dotClass={seg.unconfirmed ? 'bg-text-muted' : style.color.dotClass}
              start={seg.start}
              title={seg.unconfirmed ? undefined : `${style.label} · ${sourceLabel}`}
            >
              {seg.unconfirmed ? (
                <TranscriptPendingSpeaker />
              ) : (
                <>
                  <TranscriptSpeakerName
                    sessionId={sessionId}
                    speakerId={seg.speaker}
                    source={seg.source}
                    speakers={speakers}
                    style={style}
                  />
                  <span className="sr-only">({sourceLabel})</span>
                </>
              )}
            </TranscriptSpeakerHeader>
          )}
          <div data-seg-id={seg.id} className="min-w-0 pl-3.5">
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
