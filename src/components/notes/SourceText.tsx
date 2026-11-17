import { Text } from '@jensbouma123/acciva-ui';
import { requestReveal } from '@/lib/meeting/seek-event';
import type { SourceTextProps } from './NotesPanel.types';

export function SourceText({ t, text, segmentId, done }: SourceTextProps) {
  if (!segmentId) return <Text size="sm" className="min-w-0 flex-1 break-words py-0.5">{text}</Text>;
  return <button type="button" onClick={() => requestReveal(segmentId)} aria-label={`${t('showInTranscript')}: ${text}`}
    title={t('showInTranscript')}
    className={`min-w-0 flex-1 cursor-pointer break-words rounded-md py-0.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-1 ${done ? 'line-through opacity-60' : ''}`}>
    {text}
  </button>;
}
