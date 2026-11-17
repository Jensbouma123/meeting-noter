// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSettingsDialog } from './useSettingsDialog';

describe('useSettingsDialog', () => {
  it('opens on the requested section', () => {
    const { result } = renderHook(() => useSettingsDialog());
    act(() => result.current.openSettings('about'));
    expect(result.current.settingsOpen).toBe(true);
    expect(result.current.settingsSection).toBe('about');
  });

  it('clears the requested section when closed so a later plain open uses the remembered one', () => {
    const { result } = renderHook(() => useSettingsDialog());
    act(() => result.current.openSettings('about'));
    act(() => result.current.setSettingsOpen(false));
    expect(result.current.settingsOpen).toBe(false);
    expect(result.current.settingsSection).toBeUndefined();
    act(() => result.current.setSettingsOpen(true));
    expect(result.current.settingsOpen).toBe(true);
    expect(result.current.settingsSection).toBeUndefined();
  });
});
