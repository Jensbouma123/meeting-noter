// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const setMode = vi.fn();
vi.mock('@jensbouma123/acciva-ui/theme', () => ({ useTheme: () => ({ setMode }) }));

const { useThemePreference } = await import('./useThemePreference');

beforeEach(() => {
  localStorage.clear();
  setMode.mockClear();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
});

describe('useThemePreference', () => {
  it('adopts the stored preference after mount and applies it', () => {
    localStorage.setItem('mn-theme-preference', 'dark');
    const { result } = renderHook(() => useThemePreference());
    expect(result.current.preference).toBe('dark');
    expect(setMode).toHaveBeenCalledWith('dark');
  });

  it('defaults to system when nothing is stored', () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current.preference).toBe('system');
    expect(setMode).toHaveBeenCalledWith('system');
  });

  it('persists a choice and shares it with every consumer', () => {
    const first = renderHook(() => useThemePreference());
    const second = renderHook(() => useThemePreference());

    act(() => first.result.current.choose('light'));

    expect(localStorage.getItem('mn-theme-preference')).toBe('light');
    expect(first.result.current.preference).toBe('light');
    expect(second.result.current.preference).toBe('light');
    expect(setMode).toHaveBeenLastCalledWith('light');
  });

  it('treats System as the absence of an explicit stored preference', () => {
    localStorage.setItem('mn-theme-preference', 'dark');
    const { result } = renderHook(() => useThemePreference());

    act(() => result.current.choose('system'));

    expect(localStorage.getItem('mn-theme-preference')).toBeNull();
    expect(result.current.preference).toBe('system');
    expect(setMode).toHaveBeenLastCalledWith('system');
  });
});
