// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('recording clock', () => {
  it('counts while live and restarts at 0:00 when a new recording starts', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = renderDockWithStatus('idle', 'both');
      rerender(dockElement('live', 'both'));
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByRole('timer')).toHaveTextContent('0:03');

      rerender(dockElement('idle', 'both'));
      rerender(dockElement('live', 'both'));
      expect(screen.getByRole('timer')).toHaveTextContent('0:00');
    } finally {
      vi.useRealTimers();
    }
  });
});

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

describe('dock states', () => {
  function renderState(status: Status, extra: Partial<Parameters<typeof BottomDock>[0]> = {}) {
    const handlers = { onStart: vi.fn(), onStop: vi.fn(), onPause: vi.fn(), onResume: vi.fn() };
    render(
      <LanguageContext.Provider value="nl">
        <BottomDock
          status={status}
          mode="both"
          modelReadiness="ready"
          modelProgress={NO_MODEL_PROGRESS}
          onModeChange={() => {}}
          onOpenAdvanced={() => {}}
          {...handlers}
          {...extra}
        />
      </LanguageContext.Provider>,
    );
    return handlers;
  }

  it('idle: one solid red Record action, no clock, pause or stop', () => {
    const h = renderState('idle');
    const record = screen.getByRole('button', { name: 'Opnemen (R).' });
    expect(record).toHaveTextContent('Opnemen');
    expect(record).toHaveClass('bg-danger', 'text-danger-foreground');
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pauzeren' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Opname stoppen/ })).toBeNull();
    fireEvent.click(record);
    expect(h.onStart).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('tab').every((tab) => !(tab as HTMLButtonElement).disabled)).toBe(true);
  });

  it('without a model: the primary action offers the download', () => {
    renderState('idle', { modelReadiness: 'not-downloaded' });
    expect(screen.getByRole('button', { name: 'Model downloaden' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Opnemen (R).' })).toBeNull();
  });

  it('recording: Record becomes a translucent red Stop with the clock; source and microphone locked', () => {
    const h = renderState('live');
    expect(screen.queryByRole('button', { name: 'Opnemen (R).' })).toBeNull();
    const stop = screen.getByRole('button', { name: 'Opname stoppen, 0:00' });
    expect(stop).toContainElement(screen.getByRole('timer'));
    expect(screen.getByRole('timer')).toHaveTextContent('0:00');
    expect(stop).toHaveClass('!bg-danger/10', '!text-danger');
    expect(stop).not.toHaveClass('bg-danger');
    fireEvent.click(stop);
    expect(h.onStop).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Pauzeren' }));
    expect(h.onPause).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('tab').every((tab) => (tab as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByRole('button', { name: 'Microfoon kiezen' })).toBeDisabled();
  });

  it('paused: Stop announces the pause and the pause control resumes', () => {
    const h = renderState('paused');
    expect(screen.getByRole('button', { name: 'Opname stoppen, 0:00, Gepauzeerd' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hervatten' }));
    expect(h.onResume).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Pauzeren' })).toBeNull();
  });

  it('stopping: no Record yet; a disabled "Finishing transcription" with the flush progress', async () => {
    const flush = await import('@/lib/meeting/live-flush-progress');
    flush.beginLiveFlush(1000);
    flush.updateLiveFlush(600);
    try {
      const h = renderState('stopping');
      expect(screen.queryByRole('button', { name: 'Opnemen (R).' })).toBeNull();
      const finishing = screen.getByRole('button', { name: 'Transcriptie afronden… 40%' });
      expect(finishing).toBeDisabled();
      fireEvent.click(finishing);
      expect(h.onStart).not.toHaveBeenCalled();
      expect(h.onStop).not.toHaveBeenCalled();
      expect(screen.getAllByRole('tab').every((tab) => (tab as HTMLButtonElement).disabled)).toBe(true);
    } finally {
      flush.endLiveFlush();
    }
  });

  it('stopping without a measured flush: "Finishing transcription" without a percentage', () => {
    renderState('stopping');
    expect(screen.getByRole('button', { name: 'Transcriptie afronden…' })).toBeDisabled();
  });

  it('shows exactly one tooltip for Stop', () => {
    renderState('live');
    const stop = screen.getByRole('button', { name: /^Opname stoppen/ });
    fireEvent.mouseEnter(stop);
    const tips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toHaveTextContent('Opname stoppen (R).');
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
