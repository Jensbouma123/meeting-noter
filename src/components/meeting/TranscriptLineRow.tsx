'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { useT } from '@/lib/i18n/useT';
import { SpeakerAssign } from './SpeakerAssign';
import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptLineRowProps } from './LiveTranscript.types';

export function TranscriptLineRow({ item, index, isLast, rowClass, sessionId, speakers }: TranscriptLineRowProps) {
  const t = useT('transcript');
  const speakerStyle = useSpeakerStyle(speakers);
  const { seg, turnStart } = item;
  const { label: speakerLabel, colorIndex, color: colorStyle } = speakerStyle(seg.speaker, seg.source);
  const sourceLabel = seg.source === 'mic' ? t('mic') : t('call');

  return (
    <div className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${isLast ? 'pb-40' : ''}`}>
      <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
        <div
          data-speaker={seg.speaker}
          data-turn-start={turnStart ? '' : undefined}
          className={`${rowClass} relative py-1.5 ${
            turnStart && index > 0
              ? 'before:absolute before:inset-x-0 before:top-0 before:border-t before:border-border-subtle/40'
              : ''
          }`}
        >
          <Text as="span" size="xs" variant="muted" font="mono" className="select-none text-right tabular-nums">
            {formatClock(seg.start)}
          </Text>
          {seg.unconfirmed ? (
            <span
              data-speaker-pending=""
              role="status"
              aria-label={t('pendingSpeaker')}
              title={t('pendingSpeaker')}
              className={`flex min-w-0 items-baseline gap-1.5 select-none ${turnStart ? '' : 'invisible'}`}
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
          ) : (
            <span className="flex min-w-0 items-baseline gap-1.5 select-none" title={`${speakerLabel} · ${sourceLabel}`}>
              <span
                className={`inline-block size-2 shrink-0 self-center rounded-full transition-colors duration-200 ${colorStyle.dotClass}`}
                aria-hidden="true"
              />
              {sessionId && turnStart ? (
                <SpeakerAssign
                  sessionId={sessionId}
                  speakerId={seg.speaker}
                  label={speakerLabel}
                  source={seg.source}
                  otherLabels={Object.values(speakers).filter((sp) => sp.id !== seg.speaker).map((sp) => sp.label)}
                  textClassName={`text-sm font-semibold ${colorStyle.textClass}`}
                />
              ) : (
                <Text
                  as="span"
                  size="sm"
                  weight="semibold"
                  className={`truncate ${colorStyle.textClass} ${turnStart ? '' : 'invisible'}`}
                >
                  {speakerLabel}
                </Text>
              )}
              {turnStart && <span className="sr-only">({sourceLabel})</span>}
            </span>
          )}
          <div data-seg-id={seg.id} className="min-w-0">
            <TranscriptTurn
              actions={buildTurnActions(sessionId, seg)}
              segment={seg}
              speakerLabel={speakerLabel}
              speakerColorIndex={colorIndex}
              showHeader={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
