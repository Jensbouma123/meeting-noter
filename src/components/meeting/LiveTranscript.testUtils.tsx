import type { Segment, Speaker } from '@/lib/meeting';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import type { Language } from '@/lib/i18n/types';
import { LiveTranscript } from './LiveTranscript';

export const speakers: Record<string, Speaker> = {
  'mic:0': { id: 'mic:0', source: 'mic', label: 'Speaker 1', colorIndex: 0 },
  'mic:1': { id: 'mic:1', source: 'mic', label: 'Speaker 2', colorIndex: 1 },
};

export const seg = (id: string, speaker: string, start: number, text = id): Segment => ({
  id,
  source: 'mic',
  speaker,
  text,
  start,
  end: start + 2,
  final: true,
});

export const overlap = { start: 4, end: 6, speakers: ['mic:0', 'mic:1'] };

export const overlapTranscript: Segment[] = [
  seg('a', 'mic:0', 0, 'so I think'),
  { ...seg('b', 'mic:0', 4, 'we should'), overlap },
  { ...seg('c', 'mic:1', 4.5, 'no wait'), overlap },
  seg('d', 'mic:1', 7, 'hear me out'),
];

export function view(
  segments: Segment[],
  { sessionId, language = 'en' }: { sessionId?: string; language?: Language } = {},
) {
  return (
    <LanguageContext.Provider value={language}>
      <LiveTranscript
        sessionId={sessionId}
        segments={segments}
        speakers={speakers}
        status="live"
        autoScrollEnabled={false}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />
    </LanguageContext.Provider>
  );
}

export function timeline(container: HTMLElement): [string, string[][]][] {
  const turns: [string, string[][]][] = [];
  for (const line of container.querySelectorAll('[data-seg-id]')) {
    const row = line.parentElement!;
    if (row.hasAttribute('data-turn-start')) turns.push([speakerShown(row), []]);
    turns[turns.length - 1][1].push([row.children[0].textContent ?? '', line.getAttribute('data-seg-id') ?? '']);
  }
  return turns;
}

export function speakerShown(row: Element): string {
  return row.children[1].querySelector('[data-speaker-name]')?.textContent ?? '';
}

export const rowOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-seg-id="${id}"]`)!.parentElement!;
