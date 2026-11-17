'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { useT } from '@/lib/i18n/useT';
import { OverlapBracket } from './OverlapBracket';
import { OverlapColumn } from './OverlapColumn';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptOverlapRowProps } from './LiveTranscript.types';

const DIVIDER = 'before:absolute before:inset-x-0 before:top-0 before:border-t before:border-border-subtle/40';

export function TranscriptOverlapRow({ item, index, isLast, rowClass, sessionId, speakers, flash }: TranscriptOverlapRowProps) {
  const t = useT('transcript');
  const speakerStyle = useSpeakerStyle(speakers);
  const { start, columns } = item;
  const names = columns.map((c) => speakerStyle(c.speaker, c.segs[0].source).label);
  const groupLabel = t('overlap').replace('{names}', names.join(t('and')));

  return (
    <div ref={flash?.ref} className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${isLast ? 'pb-40' : ''} ${flash?.className ?? ''}`}>
      <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
        <div
          role="group"
          aria-label={groupLabel}
          data-overlap=""
          data-turn-start=""
          className={`${rowClass} relative py-1.5 ${index > 0 ? DIVIDER : ''}`}
        >
          <Text as="span" size="xs" variant="muted" font="mono" className="select-none text-right tabular-nums">
            {formatClock(start)}
          </Text>
          <div className="relative col-span-2 min-w-0 pl-3 sm:pl-0">
            <OverlapBracket title={groupLabel} />
            <div
              className="flex flex-col gap-y-2 sm:grid sm:gap-x-4"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              {columns.map(({ speaker, segs }) => (
                <OverlapColumn
                  key={speaker}
                  speakerId={speaker}
                  segs={segs}
                  speakers={speakers}
                  sessionId={sessionId}
                  style={speakerStyle(speaker, segs[0].source)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
