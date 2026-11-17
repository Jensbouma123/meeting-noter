// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestReveal } from '@/lib/meeting/seek-event';
import { seg, view } from './LiveTranscript.testUtils';
import { stubVirtualListEnvironment } from './LiveTranscript.virtualList.testUtils';

const scroll = vi.fn();
const segments = Array.from({ length: 40 }, (_, i) => seg(`s${i}`, i % 2 ? 'mic:1' : 'mic:0', i * 10, `line ${i}`));
const flashed = (container: HTMLElement) => container.querySelectorAll('.bg-primary-500\\/15');

describe('revealing a segment in the virtualised transcript', () => {
  stubVirtualListEnvironment();
  beforeEach(() => {
    vi.useFakeTimers();
    scroll.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('scrolls the segment to centre, highlights it, and clears after a second', () => {
    const { container } = render(view(segments));
    Element.prototype.scrollIntoView = scroll;
    act(() => requestReveal('s2'));
    expect(flashed(container)).toHaveLength(1);
    expect(flashed(container)[0].querySelector('[data-seg-id="s2"]')).not.toBeNull();
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(flashed(container)).toHaveLength(0);
  });

  it('uses instant scrolling under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} }));
    render(view(segments));
    Element.prototype.scrollIntoView = scroll;
    act(() => requestReveal('s1'));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('ignores an unknown segment id', () => {
    const { container } = render(view(segments));
    act(() => requestReveal('missing'));
    expect(flashed(container)).toHaveLength(0);
  });
});
