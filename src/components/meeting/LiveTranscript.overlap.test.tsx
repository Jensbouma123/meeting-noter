// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { rowOf, seg, speakerShown, timeline, view } from './LiveTranscript.testUtils';
import { LiveTranscript } from './LiveTranscript';
import { speakers } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript overlapping speech', () => {
  const overlap = { start: 4, end: 6, speakers: ['mic:0', 'mic:1'] };
  const transcript = [
    seg('a', 'mic:0', 0, 'so I think'),
    { ...seg('b', 'mic:0', 4, 'we should'), overlap },
    { ...seg('c', 'mic:1', 4.5, 'no wait'), overlap },
    seg('d', 'mic:1', 7, 'hear me out'),
  ];

  const columns = (row: Element) =>
    [...row.querySelectorAll('[data-overlap-speaker]')].map((col) => [
      col.querySelector('.truncate')!.textContent,
      [...col.querySelectorAll('[data-seg-id]')].map((l) => l.getAttribute('data-seg-id')),
    ]);

  it('shows the overlap as one row, a column per speaker, then rejoins one column', () => {
    const { container } = render(view(transcript));
    const rows = [...container.querySelectorAll('[data-index]')];
    expect(rows).toHaveLength(3);

    const split = rows[1].querySelector('[data-overlap]')!;
    expect(split.getAttribute('aria-label')).toBe('Speaking at the same time: Speaker 1 and Speaker 2');
    expect(split.children[0].textContent).toBe('00:04');
    expect(columns(split)).toEqual([
      ['Speaker 1', ['b']],
      ['Speaker 2', ['c']],
    ]);
    for (const [id, name] of [['a', 'Speaker 1'], ['d', 'Speaker 2']]) {
      const row = rowOf(container, id);
      expect(row.hasAttribute('data-turn-start')).toBe(true);
      expect(speakerShown(row)).toBe(name);
    }
  });

  it('shows an overlap whose words are all one speaker\'s as that speaker\'s lines', () => {
    const { container } = render(view([
      seg('a', 'mic:0', 0, 'name,'),
      { ...seg('b', 'mic:0', 4, 'about the four'), overlap },
      seg('c', 'mic:0', 7, 'galaxy thing'),
    ]));
    expect(container.querySelector('[data-overlap]')).toBeNull();
    expect(container.textContent).not.toContain('…');
    expect(timeline(container)).toEqual([['Speaker 1', [['00:00', 'a'], ['00:04', 'b'], ['00:07', 'c']]]]);
  });

  it('leaves out the column of an overlapping speaker no words were caught of', () => {
    const three = { start: 4, end: 6, speakers: ['mic:0', 'mic:2', 'mic:1'] };
    const { container } = render(view([
      { ...seg('b', 'mic:0', 4, 'we should'), overlap: three },
      { ...seg('c', 'mic:1', 4.5, 'no wait'), overlap: three },
    ]));
    const split = container.querySelector('[data-overlap]')!;
    expect(columns(split)).toEqual([
      ['Speaker 1', ['b']],
      ['Speaker 2', ['c']],
    ]);
    expect(split.getAttribute('aria-label')).toBe('Speaking at the same time: Speaker 1 and Speaker 2');
    expect(container.textContent).not.toContain('…');
  });

  it('draws one bar per column: the speaker colour, not the line\'s grey rule too', () => {
    const { container } = render(view(transcript));
    for (const col of container.querySelectorAll('[data-overlap-speaker]')) {
      const bar = col.querySelector(':scope > span[aria-hidden="true"]')!;
      expect(bar.className).toContain('sm:block');
      const rule = col.querySelector('.turn-block > div')!;
      expect(rule.className).toContain('border-l-2');
      expect(col.className.split(' ')).toEqual(
        expect.arrayContaining(['sm:[&_.turn-block>div]:border-l-0', 'sm:[&_.turn-block>div]:pl-0']),
      );
    }
    expect(rowOf(container, 'a').querySelector('[data-overlap-speaker]')).toBeNull();
  });

  it('shows the mic and the call talking at once as one split row, a column each', () => {
    const call: Segment = { ...seg('s', 'system:0', 8.5, 'no wait hear me'), source: 'system' };
    const { container } = render(
      <LiveTranscript
        segments={[seg('a', 'mic:0', 0, 'so I think'), seg('m', 'mic:0', 8, 'we should ship'), call]}
        speakers={{ ...speakers, 'system:0': { id: 'system:0', source: 'system', label: 'Caller', colorIndex: 2 } }}
        status="live"
        autoScrollEnabled={false}
        onStartRecording={() => {}}
        modelReady
        onOpenSettings={() => {}}
      />,
    );
    const split = container.querySelector('[data-overlap]')!;
    expect(split.getAttribute('aria-label')).toBe('Speaking at the same time: Speaker 1 and Caller');
    expect(columns(split)).toEqual([
      ['Speaker 1', ['m']],
      ['Caller', ['s']],
    ]);
    expect(speakerShown(rowOf(container, 'a'))).toBe('Speaker 1');
  });

  it('stacks the columns under one bracket on a phone instead of scrolling sideways', () => {
    const { container } = render(view(transcript));
    const split = container.querySelector('[data-overlap]')!;
    const bracket = split.querySelector('[data-overlap-bracket]')!;
    expect(bracket.className).toContain('sm:hidden');
    const grid = split.querySelector('[data-overlap-speaker]')!.parentElement as HTMLElement;
    expect(grid.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col', 'sm:grid']));
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(split.innerHTML).not.toContain('overflow-x');
  });

  it('shows a session saved before overlaps as single-column rows', () => {
    const legacy = transcript.map((line) => {
      const rest = { ...line };
      delete rest.overlap;
      return rest;
    });
    const { container } = render(view(legacy));
    expect(container.querySelector('[data-overlap]')).toBeNull();
    expect(container.querySelectorAll('[data-index]')).toHaveLength(4);
  });
});
