// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { BottomDock } from './BottomDock';
import { NO_MODEL_PROGRESS } from './modelReadiness';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings } from './types';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('capture mode toggle', () => {
  it('offers exactly Mic and Mic + gesprek', () => {
    render(
      <ToastProvider>
        <BottomDock
          status="idle"
          mode="both"
          modelReadiness="ready"
          modelProgress={NO_MODEL_PROGRESS}
          onModeChange={() => {}}
          onStart={() => {}}
          onStop={() => {}}
          onPause={() => {}}
          onResume={() => {}}
        />
      </ToastProvider>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Mic', 'Mic + gesprek']);
  });
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
});
