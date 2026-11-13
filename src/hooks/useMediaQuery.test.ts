// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaQueryListener } from './types';
import { useMediaQuery } from './useMediaQuery';

let matches = false;
const listeners = new Set<MediaQueryListener>();

beforeEach(() => {
  matches = false;
  listeners.clear();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, l: MediaQueryListener) => listeners.add(l),
    removeEventListener: (_: string, l: MediaQueryListener) => listeners.delete(l),
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => vi.restoreAllMocks());

describe('useMediaQuery', () => {
  it('reports the current match and updates on change events', () => {
    matches = true;
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'));
    expect(result.current).toBe(true);

    matches = false;
    act(() => listeners.forEach((l) => l()));
    expect(result.current).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 640px)'));
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
