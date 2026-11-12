// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CaptureMode, Status } from '@/lib/meeting';
import { BottomDock } from './BottomDock';
import { NO_MODEL_PROGRESS } from './modelReadiness';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings } from './types';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function dockElement(
  status: Status,
  mode: CaptureMode,
  onModeChange: (m: CaptureMode) => void = () => {},
  onOpenAdvanced: () => void = () => {},
) {
  return (
    <LanguageContext.Provider value="nl">
      <BottomDock
        status={status}
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
    </LanguageContext.Provider>
  );
}

function renderDock(mode: CaptureMode, onModeChange: (m: CaptureMode) => void = () => {}, onOpenAdvanced: () => void = () => {}) {
  render(dockElement('idle', mode, onModeChange, onOpenAdvanced));
}

function renderDockWithStatus(status: Status, mode: CaptureMode) {
  return render(dockElement(status, mode));
}

describe('capture mode toggle', () => {
  it('offers exactly Mic and Mic + gesprek', () => {
    renderDock('both');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Mic', 'Mic + gesprek']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
  });

  it('shows a tooltip on hover and on keyboard focus', async () => {
    renderDock('both');
    const [mic, both] = screen.getAllByRole('tab');
    fireEvent.mouseEnter(mic);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Neemt alleen je microfoon op.');
    fireEvent.mouseLeave(mic);
    // ACCIVA 0.17.9 closes a hover tooltip after a short delay, not immediately.
    await waitFor(() => expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull());
    fireEvent.focus(both);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Neemt je microfoon en het geluid van je gesprek op (Teams, Zoom, Meet).');
  });

  it('shows exactly one tooltip per option on hover, also while recording', () => {
    const { rerender } = renderDockWithStatus('idle', 'both');
    const [mic] = screen.getAllByRole('tab');
    fireEvent.mouseEnter(mic);
    expect(screen.getAllByRole('tooltip', { hidden: true })).toHaveLength(1);
    fireEvent.mouseLeave(mic);

    rerender(dockElement('live', 'both'));
    const [liveMic] = screen.getAllByRole('tab');
    fireEvent.mouseEnter(liveMic);
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips).toHaveLength(1);
    expect(tooltips[0]).toHaveTextContent('Neemt alleen je microfoon op. Stop de opname om de audiobron te wijzigen.');
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
