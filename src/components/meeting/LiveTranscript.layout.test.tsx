// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { rowOf, seg, view } from './LiveTranscript.testUtils';

afterEach(cleanup);

describe('LiveTranscript speaker header layout', () => {
  it('puts dot, name and time on a header line above the full-width text', () => {
    const { container } = render(view([seg('a', 'mic:0', 0), seg('b', 'mic:1', 5)]));
    const row = rowOf(container, 'a');
    expect(row.className).not.toMatch(/grid/);
    const [header, text] = Array.from(row.children);
    const [dot, name, time] = Array.from(header.children);
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.className).toContain('bg-primary-500');
    expect(name.querySelector('[data-speaker-name]')!.textContent).toBe('Speaker 1');
    expect(time.textContent).toBe('00:00');
    expect(text.getAttribute('data-seg-id')).toBe('a');
    expect(text.className).toContain('pl-3.5');
    expect(rowOf(container, 'b').firstElementChild!.firstElementChild!.className).toContain('bg-secondary-500');
  });

  it('shows hh:mm:ss in the header past the first hour without a time column', () => {
    const { container } = render(view([seg('a', 'mic:0', 3725)]));
    const row = rowOf(container, 'a');
    expect(row.querySelector('[data-speaker-time]')!.textContent).toBe('01:02:05');
    expect(row.className).not.toMatch(/grid-cols/);
  });
});
