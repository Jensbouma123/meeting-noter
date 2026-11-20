// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { overlapTranscript as transcript, rowOf, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript overlap row', () => {
  it('names both speakers in one cell, "A + B (at the same time)", and marks each line with its colour', () => {
    const { container } = render(view(transcript));
    const split = container.querySelector('[data-overlap]')!;
    expect(split.querySelector('[data-overlap-names]')!.textContent).toBe('Speaker 1+Speaker 2(at the same time)');
    const [first, second] = split.querySelectorAll('[data-overlap-speaker]');
    expect(first.getAttribute('data-overlap-speaker')).toBe('mic:0');
    expect(first.querySelector('[aria-hidden="true"]')!.className).toContain('bg-primary-500');
    expect(first.querySelector('.sr-only')!.textContent).toBe('Speaker 1:');
    expect(second.querySelector('[aria-hidden="true"]')!.className).toContain('bg-secondary-500');
    expect(rowOf(container, 'a').querySelector('[data-overlap-speaker]')).toBeNull();
  });

  it('says "Spreker N + Spreker M (tegelijk)" in Dutch', () => {
    const { container } = render(view(transcript, { language: 'nl' }));
    expect(container.querySelector('[data-overlap]')!.getAttribute('aria-label')).toBe(
      'Tegelijk aan het praten: Spreker 1 en Spreker 2',
    );
    expect(container.querySelector('[data-overlap-names]')!.textContent).toBe('Spreker 1+Spreker 2(tegelijk)');
  });

  it("stacks the speakers' words in the row's text column at every width instead of side by side", () => {
    const { container } = render(view(transcript));
    const split = container.querySelector('[data-overlap]')!;
    expect(split.children).toHaveLength(3);
    const stack = split.children[2];
    expect(stack.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col']));
    expect(stack.className).not.toMatch(/grid/);
    expect([...stack.children].map((c) => c.getAttribute('data-overlap-speaker'))).toEqual(['mic:0', 'mic:1']);
    expect(split.querySelector('[data-overlap-bracket]')).toBeNull();
    expect(split.innerHTML).not.toContain('overflow-x');
  });
});
