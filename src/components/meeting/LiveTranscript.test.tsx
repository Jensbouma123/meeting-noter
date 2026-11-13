// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rowOf, seg, speakerShown, timeline, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript timeline', () => {
  it('shows lines in time order with a timestamp on every line', () => {
    const { container } = render(
      view([seg('b', 'mic:0', 12), seg('a', 'mic:0', 3), seg('c', 'mic:0', 40), seg('d', 'mic:0', 65)]),
    );
    expect(timeline(container)).toEqual([
      ['Speaker 1', [['00:03', 'a'], ['00:12', 'b'], ['00:40', 'c'], ['01:05', 'd']]],
    ]);
  });

  it('shows the speaker once per turn and starts a turn on every speaker change', () => {
    const { container } = render(
      view([seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:1', 6), seg('d', 'mic:0', 9)]),
    );
    expect(timeline(container)).toEqual([
      ['Speaker 1', [['00:00', 'a'], ['00:03', 'b']]],
      ['Speaker 2', [['00:06', 'c']]],
      ['Speaker 1', [['00:09', 'd']]],
    ]);
    expect([...container.querySelectorAll('[data-seg-id]')].map((l) => speakerShown(l.parentElement!))).toEqual([
      'Speaker 1',
      '',
      'Speaker 2',
      'Speaker 1',
    ]);
  });

  it('starts a new turn after a pause over 30 s from the same speaker', () => {
    const { container } = render(view([seg('a', 'mic:0', 0), seg('b', 'mic:0', 40)]));
    expect(timeline(container).map(([, lines]) => lines.map(([, id]) => id))).toEqual([['a'], ['b']]);
  });

  it('moves a line into the right turn when diarization reassigns it late', () => {
    const lines = [seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:0', 6)];
    const { container, rerender } = render(view(lines));
    expect(timeline(container)).toHaveLength(1);

    rerender(view([lines[0], { ...lines[1], speaker: 'mic:1' }, { ...lines[2], speaker: 'mic:1' }]));
    expect(timeline(container)).toEqual([
      ['Speaker 1', [['00:00', 'a']]],
      ['Speaker 2', [['00:03', 'b'], ['00:06', 'c']]],
    ]);
  });

  it('shows hh:mm:ss past the first hour', () => {
    const { container } = render(view([seg('a', 'mic:0', 3725)]));
    expect(timeline(container)).toEqual([['Speaker 1', [['01:02:05', 'a']]]]);
  });

  it('relabels a line in place when diarization reassigns it: same row, same shape', () => {
    const lines = [seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:0', 6)];
    const { container, rerender } = render(view(lines));
    const before = rowOf(container, 'c');
    expect(speakerShown(before)).toBe('');
    expect(before.getAttribute('data-speaker')).toBe('mic:0');
    const shape = (row: Element) => [row.children.length, row.className.replace(/\bbefore:\S+/g, '').trim()];
    const shapeBefore = shape(before);

    rerender(view([lines[0], lines[1], { ...lines[2], speaker: 'mic:1' }]));
    const after = rowOf(container, 'c');
    expect(after).toBe(before);
    expect(after.getAttribute('data-speaker')).toBe('mic:1');
    expect(speakerShown(after)).toBe('Speaker 2');
    expect(shape(after)).toEqual(shapeBefore);
    expect(container.querySelectorAll('[data-index]')).toHaveLength(3);
    expect(after.closest('[data-index]')!.getAttribute('data-index')).toBe('2');
  });

  it('never size-contains lines, and shows the speaker in the line\'s own row', () => {
    const { container, rerender } = render(view([seg('a', 'mic:0', 3, 'hi')]));
    const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/content-visibility|contain-intrinsic|contain:\s*(size|strict|content)/);
    const row = rowOf(container, 'a');
    const [time, speaker, line] = Array.from(row.children);
    expect(time.textContent).toBe('00:03');
    expect(speaker.textContent).toContain('Speaker 1');
    expect(line.getAttribute('data-seg-id')).toBe('a');
    rerender(view([seg('a', 'mic:0', 3, 'hi '.repeat(200))]));
    const grown = rowOf(container, 'a');
    expect(grown.getAttribute('style')).toBeNull();
    expect(grown.className).not.toMatch(/(^|\s)(h-|max-h-|absolute|translate)/);
    expect(container.querySelector('[data-seg-id]')!.textContent).toContain('hi hi hi');
  });
});
