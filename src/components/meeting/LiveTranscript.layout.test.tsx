// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { rowOf, seg, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript speaker header layout', () => {
  it('puts the time in a fixed left gutter, then dot and a full-width name, above the indented text', () => {
    const { container } = render(view([seg('a', 'mic:0', 0), seg('b', 'mic:1', 5)]));
    const row = rowOf(container, 'a');
    expect(row.className).not.toMatch(/grid/);
    const [header, text] = Array.from(row.children);
    const [time, dot, name] = Array.from(header.children);
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.className).toContain('bg-primary-500');
    expect(name.querySelector('[data-speaker-name]')!.textContent).toBe('Speaker 1');
    expect(time.textContent).toBe('00:00');
    expect(time.hasAttribute('data-speaker-time')).toBe(true);
    expect(time.className).toContain('w-12');
    expect(time.className).toContain('md:w-16');
    expect(name.className.split(' ')).toEqual(expect.arrayContaining(['flex-1', 'min-w-0']));
    expect(name.className).not.toMatch(/max-w-/);
    expect(text.getAttribute('data-seg-id')).toBe('a');
    expect(text.className).toContain('pl-[4.375rem]');
    expect(text.className).toContain('md:pl-[5.375rem]');
    expect(rowOf(container, 'b').querySelector('[data-speaker-header] > [aria-hidden]')!.className).toContain('bg-secondary-500');
  });

  it('shows hh:mm:ss in the gutter past the first hour without a grid', () => {
    const { container } = render(view([seg('a', 'mic:0', 3725)]));
    const row = rowOf(container, 'a');
    expect(row.querySelector('[data-speaker-time]')!.textContent).toBe('01:02:05');
    expect(row.className).not.toMatch(/grid-cols/);
  });

  it('leaves continuation lines without a header but indented like the name', () => {
    const { container } = render(view([seg('a', 'mic:0', 0), seg('b', 'mic:0', 2)]));
    const row = rowOf(container, 'b');
    expect(row.querySelector('[data-speaker-header]')).toBeNull();
    expect(row.querySelector('[data-seg-id="b"]')!.className).toContain('pl-[4.375rem]');
  });
});
