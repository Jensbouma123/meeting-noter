// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
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

describe('audio settings drawer', () => {
  const cog = () => screen.getByRole('button', { name: 'Audio-instellingen' });
  const open = () => {
    fireEvent.click(cog());
    return screen.getByRole('dialog', { name: 'Audio-instellingen' });
  };
  const expectClosed = (node: HTMLElement) => {
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cog()).toHaveAttribute('aria-expanded', 'false');
    expect(node).toBeInTheDocument();
    fireEvent.transitionEnd(node);
    expect(node).not.toBeInTheDocument();
  };

  it('opens from the cog', () => {
    renderDock('both');
    expect(cog()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
    open();
    expect(cog()).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on Escape', () => {
    renderDock('both');
    const node = open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expectClosed(node);
  });

  it('closes on an outside pointerdown but not on one inside', () => {
    renderDock('both');
    const node = open();
    fireEvent.pointerDown(node);
    expect(screen.getByRole('dialog', { name: 'Audio-instellingen' })).toBe(node);
    fireEvent.pointerDown(document.body);
    expectClosed(node);
  });

  it('closes on a second cog click', () => {
    renderDock('both');
    const node = open();
    fireEvent.click(cog());
    expectClosed(node);
  });

  it('reports the picked mode', () => {
    const onModeChange = vi.fn();
    renderDock('both', onModeChange);
    open();
    fireEvent.click(screen.getByRole('radio', { name: /Alleen mic/ }));
    expect(onModeChange).toHaveBeenCalledWith('mic');
  });
});

describe('recording controls semantics', () => {
  it('groups action controls without creating a navigation landmark', () => {
    renderDock('both');
    expect(screen.queryByRole('navigation', { name: 'Recording controls' })).toBeNull();
    expect(screen.getByRole('group', { name: /Recording controls|Opnamebediening/ })).toBeTruthy();
  });
});
