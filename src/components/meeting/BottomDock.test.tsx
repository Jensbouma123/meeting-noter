// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dockElement, renderDock, renderDockWithStatus } from './BottomDock.testUtils';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

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
