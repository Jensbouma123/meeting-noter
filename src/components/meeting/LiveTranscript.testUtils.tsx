import type { Segment, Speaker } from '@/lib/meeting';
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

export function view(segments: Segment[]) {
  return (
    <LiveTranscript
      segments={segments}
      speakers={speakers}
      status="live"
      autoScrollEnabled={false}
      onStartRecording={() => {}}
      modelReady
      onOpenSettings={() => {}}
    />
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
  const name = row.children[1].querySelector('.truncate')!;
  return name.classList.contains('invisible') ? '' : (name.textContent ?? '');
}

export const rowOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-seg-id="${id}"]`)!.parentElement!;
