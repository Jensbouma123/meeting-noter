// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderDockState } from './BottomDock.testUtils';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('dock states', () => {
  it('idle: one solid red Record action, no clock, pause or stop', () => {
    const h = renderDockState('idle');
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
    renderDockState('idle', { modelReadiness: 'not-downloaded' });
    expect(screen.getByRole('button', { name: 'Model downloaden' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Opnemen (R).' })).toBeNull();
  });

  it('recording: Record becomes a translucent red Stop with the clock; source and microphone locked', () => {
    const h = renderDockState('live');
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
    const h = renderDockState('paused');
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
      const h = renderDockState('stopping');
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
    renderDockState('stopping');
    expect(screen.getByRole('button', { name: 'Transcriptie afronden…' })).toBeDisabled();
  });

  it('shows exactly one tooltip for Stop', () => {
    renderDockState('live');
    const stop = screen.getByRole('button', { name: /^Opname stoppen/ });
    fireEvent.mouseEnter(stop);
    const tips = screen.getAllByRole('tooltip', { hidden: true });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toHaveTextContent('Opname stoppen (R).');
  });
});
