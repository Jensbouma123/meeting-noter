// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installViewport, setViewport, VIEWPORTS } from '@/test/viewport';
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

describe('useMediaQuery with the viewport harness', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installViewport(VIEWPORTS.phone);
  });
  afterEach(() => restore());

  it('is false for the lg (1024px) breakpoint on a phone', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });

  it('is true for sm (640px) but false for lg on a tablet', () => {
    setViewport(VIEWPORTS.tablet);
    const sm = renderHook(() => useMediaQuery('(min-width: 640px)'));
    const lg = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(sm.result.current).toBe(true);
    expect(lg.result.current).toBe(false);
  });

  it('is true for lg (1024px) on desktop', () => {
    setViewport(VIEWPORTS.desktop);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('re-renders when the viewport crosses the breakpoint', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
    act(() => setViewport(VIEWPORTS.desktop));
    expect(result.current).toBe(true);
  });
});
