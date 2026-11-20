import { TranscriptTurn } from './TranscriptTurn';
import { buildTurnActions } from './buildTurnActions';
import type { OverlapColumnProps } from './OverlapColumn.types';

export function OverlapColumn({ speakerId, segs, sessionId, style }: OverlapColumnProps) {
  const { label, colorIndex, color } = style;
  return (
    <div data-overlap-speaker={speakerId} className="flex min-w-0 items-baseline gap-2">
      <span className={`inline-block size-1.5 shrink-0 -translate-y-0.5 rounded-full ${color.dotClass}`} aria-hidden="true" />
      <span className="sr-only">{label}:</span>
      <div className="min-w-0 flex-1">
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
