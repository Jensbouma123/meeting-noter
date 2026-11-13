// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings } from './settingsStorage';

afterEach(() => {
  localStorage.clear();
});

describe('saved mode migration', () => {
  it("turns a saved 'system' preference into 'both'", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, mode: 'system' }));
    expect(loadSettings().mode).toBe('both');
  });

  it('keeps mic and defaults retention to 2 years', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ mode: 'mic' }));
    const s = loadSettings();
    expect(s.mode).toBe('mic');
    expect(s.retention).toBe('2y');
  });

  it("turns a saved 'native' system capture into 'browser'", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, systemVia: 'native' }));
    expect(loadSettings().systemVia).toBe('browser');
  });
});
