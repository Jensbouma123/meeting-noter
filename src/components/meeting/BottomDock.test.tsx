// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
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

describe('capture mode dropdown', () => {
  it('shows the current mode and offers exactly Mic and Mic + gesprek', async () => {
    renderDock('both');
    fireEvent.click(screen.getByRole('button', { name: 'Audiobron: Mic + gesprek' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(items.map((i) => i.textContent)).toEqual(['Mic', 'Mic + gesprek']);
  });

  it('shows exactly one tooltip on hover, also while recording', () => {
    const { rerender } = renderDockWithStatus('idle', 'mic');
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Audiobron: Mic' }));
    expect(screen.getAllByRole('tooltip', { hidden: true })).toHaveLength(1);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Neemt alleen je microfoon op.');

    rerender(dockElement('live', 'mic'));
    const live = screen.getByRole('button', { name: 'Audiobron: Mic' });
    fireEvent.mouseEnter(live.parentElement!);
    const tooltips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tooltips).toHaveLength(1);
    expect(tooltips[0]).toHaveTextContent('Neemt alleen je microfoon op. Stop de opname om de audiobron te wijzigen.');
  });

  it('still reports the selection', async () => {
    const onModeChange = vi.fn();
    renderDock('both', onModeChange);
    fireEvent.click(screen.getByRole('button', { name: 'Audiobron: Mic + gesprek' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mic', hidden: true }));
    await waitFor(() => expect(onModeChange).toHaveBeenCalledWith('mic'));
  });
});

describe('recording controls semantics', () => {
  it('groups action controls without creating a navigation landmark', () => {
    renderDock('both');
    expect(screen.queryByRole('navigation', { name: 'Recording controls' })).toBeNull();
    expect(screen.getByRole('group', { name: /Recording controls|Opnamebediening/ })).toBeTruthy();
  });
});
