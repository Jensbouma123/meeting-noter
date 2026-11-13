import type { Segment, Speaker } from '@/lib/meeting';
import { useT } from '@/lib/i18n/useT';
import { getSpeakerColor } from './speaker-theme';
import type { SpeakerStyle } from './LiveTranscript.types';

export function useSpeakerStyle(speakers: Record<string, Speaker>) {
  const t = useT('transcript');
  return (id: string, source: Segment['source']): SpeakerStyle => {
    const speaker = speakers[id];
    const colorIndex = speaker?.colorIndex ?? 0;
    return {
      label: speaker?.label ?? (source === 'mic' ? t('you') : t('unknownSpeaker')),
      colorIndex,
      color: getSpeakerColor(colorIndex),
    };
  };
}
