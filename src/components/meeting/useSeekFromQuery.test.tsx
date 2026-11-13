// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Segment } from '@/lib/meeting';
import type { TranscriptItem } from './LiveTranscript.types';
import { seekIndex, useSeekFromQuery } from './useSeekFromQuery';

let query = 't=65';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }));

const item = (id: string, start: number, end: number): TranscriptItem => ({
  kind: 'line',
  turnStart: true,
  seg: { id, start, end, text: id } as Segment,
});
const items = [item('a', 0, 30), item('b', 30, 70), item('c', 70, 100)];

describe('seek from ?t=', () => {
  it('finds the line covering the time', () => {
    expect(seekIndex(items, 65)).toBe(1);
    expect(seekIndex(items, 500)).toBe(2);
  });

  it('scrolls once to the matching row', () => {
    query = 't=65';
    const scrollToIndex = vi.fn();
    const listRef = { current: { scrollToIndex } } as never;
    const { rerender } = renderHook(() => useSeekFromQuery(listRef, items));
    rerender();
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).toHaveBeenCalledWith(1, 'center');
  });

  it('ignores an invalid t', () => {
    query = 't=abc';
    const scrollToIndex = vi.fn();
    renderHook(() => useSeekFromQuery({ current: { scrollToIndex } } as never, items));
    expect(scrollToIndex).not.toHaveBeenCalled();
  });
});
