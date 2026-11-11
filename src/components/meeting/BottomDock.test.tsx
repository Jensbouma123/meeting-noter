// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CaptureMode } from '@/lib/meeting';
import { BottomDock } from './BottomDock';
import { NO_MODEL_PROGRESS } from './modelReadiness';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings } from './types';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function renderDock(mode: CaptureMode, onModeChange: (m: CaptureMode) => void = () => {}, onOpenAdvanced: () => void = () => {}) {
  render(
    <LanguageContext.Provider value="nl">
      <BottomDock
        status="idle"
        mode={mode}
        modelReadiness="ready"
        modelProgress={NO_MODEL_PROGRESS}
        onModeChange={onModeChange}
        onStart={() => {}}
        onStop={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onOpenAdvanced={onOpenAdvanced}
      />
    </LanguageContext.Provider>,
  );
}

describe('capture mode toggle', () => {
  it('offers exactly Mic and Mic + gesprek', () => {
    renderDock('both');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Mic', 'Mic + gesprek']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
  });

  it('shows a tooltip on hover and on keyboard focus', () => {
    renderDock('both');
    const [mic, both] = screen.getAllByRole('tab');
    fireEvent.mouseEnter(mic);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Neemt alleen je microfoon op.');
    fireEvent.mouseLeave(mic);
    fireEvent.focus(both);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Neemt je microfoon en het geluid van je gesprek op (Teams, Zoom, Meet).');
  });

  it('still reports the selection', () => {
    const onModeChange = vi.fn();
    renderDock('both', onModeChange);
    fireEvent.click(screen.getAllByRole('tab')[0]);
    expect(onModeChange).toHaveBeenCalledWith('mic');
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
