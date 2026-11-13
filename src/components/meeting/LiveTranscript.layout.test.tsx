// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Segment, Speaker } from '@/lib/meeting';
import { LiveTranscript } from './LiveTranscript';

const speakers: Record<string, Speaker> = {
  'mic:0': { id: 'mic:0', source: 'mic', label: 'Speaker 1', colorIndex: 0 },
  'mic:1': { id: 'mic:1', source: 'mic', label: 'Speaker 2', colorIndex: 1 },
};

const seg = (id: string, speaker: string, start: number): Segment => ({
  id,
  source: 'mic',
  speaker,
  text: id,
  start,
  end: start + 2,
  final: true,
});

afterEach(cleanup);

describe('LiveTranscript phone layout (390px)', () => {
  it('fits "Speaker 1"/"Speaker 2" in the phone speaker column without ellipsis', () => {
    const { container } = render(
      <LiveTranscript
        segments={[seg('a', 'mic:0', 0), seg('b', 'mic:1', 5)]}
        speakers={speakers}
        status="live"
        autoScrollEnabled={false}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />,
    );
    expect(container.textContent).toContain('Speaker 1');
    expect(container.textContent).toContain('Speaker 2');

    const row = container.querySelector('[data-seg-id="a"]')!.parentElement!;
    expect(row.className).toContain('6rem');
    expect(row.className).not.toContain('4.5rem_minmax');

    expect(row.className).toContain('sm:grid-cols-');
    expect(row.className).toContain('7rem');
  });

  it('keeps the wider phone column past the first hour too', () => {
    const { container } = render(
      <LiveTranscript
        segments={[seg('a', 'mic:0', 3725)]}
        speakers={speakers}
        status="live"
        autoScrollEnabled={false}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />,
    );
    const row = container.querySelector('[data-seg-id="a"]')!.parentElement!;
    expect(row.className).toContain('6rem');
    expect(container.textContent).toContain('Speaker 1');
  });
});
