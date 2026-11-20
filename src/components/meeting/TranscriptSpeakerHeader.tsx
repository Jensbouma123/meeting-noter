import { TranscriptGutterTime } from './TranscriptGutterTime';
import type { TranscriptSpeakerHeaderProps } from './TranscriptSpeakerHeader.types';

export function TranscriptSpeakerHeader({ dotClass, start, title, children }: TranscriptSpeakerHeaderProps) {
  return (
    <div data-speaker-header="" className="flex min-w-0 items-baseline gap-2 select-none" title={title}>
      {start !== undefined && <TranscriptGutterTime start={start} />}
      <span className={`inline-block size-1.5 shrink-0 -translate-y-0.5 rounded-full ${dotClass}`} aria-hidden="true" />
      <span data-speaker-name-slot="" className="flex min-w-0 flex-1 items-baseline gap-1.5">
        {children}
      </span>
    </div>
  );
}
