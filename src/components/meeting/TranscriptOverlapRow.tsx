'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { formatClock } from '@/lib/meeting/transcript-format';
import { useT } from '@/lib/i18n/useT';
import { OverlapColumn } from './OverlapColumn';
import { TranscriptSpeakerName } from './TranscriptSpeakerName';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptOverlapRowProps } from './LiveTranscript.types';

export function TranscriptOverlapRow({
  item,
  index,
  isLast,
  rowClass,
  sessionId,
  speakers,
  flash,
}: TranscriptOverlapRowProps) {
  const t = useT('transcript');
  const speakerStyle = useSpeakerStyle(speakers);
  const { start, columns } = item;
  const styled = columns.map((c) => ({ ...c, style: speakerStyle(c.speaker, c.segs[0].source) }));
  const groupLabel = t('overlap').replace('{names}', styled.map((c) => c.style.label).join(t('and')));

  return (
    <div
      ref={flash?.ref}
      className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${isLast ? 'pb-40' : ''} ${flash?.className ?? ''}`}
    >
      <div className="mx-auto w-full max-w-[calc(72ch+10rem)]">
        <div
          role="group"
          aria-label={groupLabel}
          data-overlap=""
          data-turn-start=""
          className={`${rowClass} ${index > 0 ? 'pt-5' : ''} pb-0.5`}
        >
          <Text as="span" size="xs" variant="muted" font="mono" className="select-none text-right tabular-nums">
            {formatClock(start)}
          </Text>
          <span data-overlap-names="" className="flex min-w-0 flex-col select-none">
            {styled.map(({ speaker, segs, style }, i) => (
              <span key={speaker} className="flex min-w-0 items-baseline gap-1">
                {i > 0 && (
                  <Text as="span" size="sm" variant="muted" aria-hidden="true">
                    +
                  </Text>
                )}
                <TranscriptSpeakerName
                  sessionId={sessionId}
                  speakerId={speaker}
                  source={segs[0].source}
                  speakers={speakers}
                  style={style}
                />
              </span>
            ))}
            <Text as="span" size="xs" variant="muted">
              ({t('together')})
            </Text>
          </span>
          <div className="flex min-w-0 flex-col gap-y-1">
            {styled.map(({ speaker, segs, style }) => (
              <OverlapColumn key={speaker} speakerId={speaker} segs={segs} sessionId={sessionId} style={style} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
