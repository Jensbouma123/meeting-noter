'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { useT } from '@/lib/i18n/useT';
import { SpeakerAssign } from './SpeakerAssign';
import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import { COLUMN_WITHOUT_LINE_RULE } from './transcriptItems';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptOverlapRowProps } from './LiveTranscript.types';

export function TranscriptOverlapRow({ item, index, isLast, rowClass, sessionId, speakers }: TranscriptOverlapRowProps) {
  const t = useT('transcript');
  const speakerStyle = useSpeakerStyle(speakers);
  const { start, columns } = item;
  const names = columns.map((c) => speakerStyle(c.speaker, c.segs[0].source).label);
  const groupLabel = t('overlap').replace('{names}', names.join(t('and')));

  return (
    <div className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${isLast ? 'pb-40' : ''}`}>
      <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
        <div
          role="group"
          aria-label={groupLabel}
          data-overlap=""
          data-turn-start=""
          className={`${rowClass} relative py-1.5 ${
            index > 0 ? 'before:absolute before:inset-x-0 before:top-0 before:border-t before:border-border-subtle/40' : ''
          }`}
        >
          <Text as="span" size="xs" variant="muted" font="mono" className="select-none text-right tabular-nums">
            {formatClock(start)}
          </Text>
          <div className="relative col-span-2 min-w-0 pl-3 sm:pl-0">
            <span
              data-overlap-bracket=""
              aria-hidden="true"
              title={groupLabel}
              className="absolute inset-y-1 left-0 w-1.5 rounded-l-sm border-y-2 border-l-2 border-text-muted/50 sm:hidden"
            />
            <div
              className="flex flex-col gap-y-2 sm:grid sm:gap-x-4"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              {columns.map(({ speaker: id, segs }) => {
                const { label, colorIndex, color } = speakerStyle(id, segs[0].source);
                return (
                  <div
                    key={id}
                    data-overlap-speaker={id}
                    className={`relative min-w-0 sm:pl-3 ${COLUMN_WITHOUT_LINE_RULE}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0.5 left-0 hidden w-0.5 rounded-full sm:block ${color.dotClass}`}
                    />
                    <span className="flex min-w-0 items-baseline gap-1.5 select-none">
                      <span className={`inline-block size-2 shrink-0 self-center rounded-full ${color.dotClass}`} aria-hidden="true" />
                      {sessionId ? (
                        <SpeakerAssign
                          sessionId={sessionId}
                          speakerId={id}
                          label={label}
                          source={segs[0].source}
                          otherLabels={Object.values(speakers).filter((sp) => sp.id !== id).map((sp) => sp.label)}
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
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
