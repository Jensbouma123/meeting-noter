'use client';

import { useT } from '@/lib/i18n/useT';
import { OverlapColumn } from './OverlapColumn';
import { useSpeakerStyle } from './useSpeakerStyle';
import type { TranscriptOverlapRowProps } from './LiveTranscript.types';

export function TranscriptOverlapRow({ item, index, isLast, sessionId, speakers, flash }: TranscriptOverlapRowProps) {
  const t = useT('transcript');
  const speakerStyle = useSpeakerStyle(speakers);
  const styled = item.columns.map((c) => ({ ...c, style: speakerStyle(c.speaker, c.segs[0].source) }));
  const groupLabel = t('overlap').replace('{names}', styled.map((c) => c.style.label).join(t('and')));

  return (
    <div
      ref={flash?.ref}
      className={`mn-vrow px-4 md:px-8 ${index === 0 ? 'pt-6' : ''} ${isLast ? 'pb-40' : ''} ${flash?.className ?? ''}`}
    >
      <div className="mx-auto w-full max-w-[calc(72ch+1rem)]">
        <div
          role="group"
          aria-label={groupLabel}
          data-overlap=""
          data-turn-start=""
          className={`flex min-w-0 flex-col gap-y-3 ${index > 0 ? 'pt-5' : ''} pb-0.5`}
        >
          {styled.map(({ speaker, segs, style }) => (
            <OverlapColumn
              key={speaker}
              speakerId={speaker}
              segs={segs}
              sessionId={sessionId}
              speakers={speakers}
              style={style}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
