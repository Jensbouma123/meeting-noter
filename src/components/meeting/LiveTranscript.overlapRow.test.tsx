// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { overlapTranscript as transcript, rowOf, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

const headers = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-overlap] [data-overlap-speaker] > [data-speaker-header]')].map(
    (h) => h.textContent,
  );

describe('LiveTranscript overlap row', () => {
  it('gives each overlapping speaker its own header with "(at the same time)" and a coloured dot', () => {
    const { container } = render(view(transcript));
    expect(headers(container)).toEqual(['Speaker 1(at the same time)00:04', 'Speaker 2(at the same time)00:04']);
    const [first, second] = container.querySelectorAll('[data-overlap-speaker]');
    expect(first.getAttribute('data-overlap-speaker')).toBe('mic:0');
    expect(first.querySelector('[aria-hidden="true"]')!.className).toContain('bg-primary-500');
    expect(second.querySelector('[aria-hidden="true"]')!.className).toContain('bg-secondary-500');
    expect(rowOf(container, 'a').querySelector('[data-overlap-speaker]')).toBeNull();
  });

  it('says "Spreker N (tegelijk)" per speaker in Dutch', () => {
    const { container } = render(view(transcript, { language: 'nl' }));
    expect(container.querySelector('[data-overlap]')!.getAttribute('aria-label')).toBe(
      'Tegelijk aan het praten: Spreker 1 en Spreker 2',
    );
    expect(headers(container)).toEqual(['Spreker 1(tegelijk)00:04', 'Spreker 2(tegelijk)00:04']);
  });

  it('stacks the speaker sub-blocks, each header above its own text', () => {
    const { container } = render(view(transcript));
    const split = container.querySelector('[data-overlap]')!;
    expect(split.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col']));
    expect(split.className).not.toMatch(/grid/);
    expect([...split.children].map((c) => c.getAttribute('data-overlap-speaker'))).toEqual(['mic:0', 'mic:1']);
    for (const block of split.children) {
      expect(block.children[0].hasAttribute('data-speaker-header')).toBe(true);
      expect(block.children[1].querySelector('[data-seg-id]')).not.toBeNull();
    }
    expect(split.innerHTML).not.toContain('overflow-x');
  });
});
