// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { rowOf, seg, speakerShown, view } from './LiveTranscript.testUtils';
import { buildTranscriptItems } from './transcriptItems';

afterEach(cleanup);

const lines = [seg('a', 'mic:0', 0), seg('b', 'mic:0', 3), seg('c', 'mic:0', 40), seg('d', 'mic:1', 43)];

describe('LiveTranscript speaker blocks', () => {
  it('opens a block only on a speaker change and shows the time again after a pause', () => {
    const flags = buildTranscriptItems(lines).map((item) =>
      item.kind === 'line' ? [item.seg.id, item.turnStart, item.showTime] : [],
    );
    expect(flags).toEqual([
      ['a', true, true],
      ['b', false, false],
      ['c', false, true],
      ['d', true, true],
    ]);
  });

  it('spaces blocks apart with padding, not divider lines', () => {
    const { container } = render(view(lines));
    const gap = (id: string) => rowOf(container, id).className.match(/\bpt-\S+/)?.[0] ?? '';
    expect(['a', 'b', 'c', 'd'].map(gap)).toEqual(['', '', 'pt-3', 'pt-5']);
    expect(container.innerHTML).not.toMatch(/before:border-t|border-l-2/);
  });

  it('gives a continuation line no header, only its text', () => {
    const { container } = render(view(lines));
    const row = rowOf(container, 'b');
    expect(row.children).toHaveLength(1);
    expect(row.querySelector('[data-speaker-header]')).toBeNull();
    expect(speakerShown(rowOf(container, 'c'))).toBe('');
    expect(speakerShown(rowOf(container, 'd'))).toBe('Speaker 2');
  });

  it('shows "Spreker N" with a pencil to rename it in a saved Dutch session', () => {
    const { container } = render(view(lines, { sessionId: 's1', language: 'nl' }));
    const row = rowOf(container, 'a');
    expect(speakerShown(row)).toBe('Spreker 1');
    expect(row.querySelector('[data-testid="speaker-assign"] [data-speaker-edit]')).not.toBeNull();
  });
});
