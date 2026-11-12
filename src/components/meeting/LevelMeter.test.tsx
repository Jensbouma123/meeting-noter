// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import type { Levels } from '@/lib/meeting';

// Drive the level bus by hand: the real one is fed by the capture worklet.
let pushLevels: ((levels: Levels) => void) | null = null;
vi.mock('./store', () => ({
  meeting: {
    subscribeLevels: (cb: (levels: Levels) => void) => {
      pushLevels = cb;
      return () => {
        pushLevels = null;
      };
    },
  },
}));

import { LevelMeter } from './LevelMeter';

// jsdom runs a real rAF timer; stepping frames by hand keeps the smoothing
// arithmetic deterministic.
const frames: FrameRequestCallback[] = [];
let cancelled = 0;

beforeEach(() => {
  frames.length = 0;
  cancelled = 0;
  pushLevels = null;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {
    cancelled += 1;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function step(): void {
  for (const cb of frames.splice(0)) cb(0);
}

function meter(label: string): HTMLElement {
  return screen.getByRole('meter', { name: label });
}

function renderMeter(mode: 'mic' | 'both', active = true) {
  render(
    <LanguageContext.Provider value="en">
      <LevelMeter mode={mode} active={active} />
    </LanguageContext.Provider>,
  );
}

describe('LevelMeter', () => {
  it('mirrors the smoothed level onto the meter track for assistive tech', () => {
    renderMeter('both');
    pushLevels!({ mic: 1, system: 0.5 });
    step();
    // Attack is 0.5: half of the remaining distance in the first frame.
    expect(meter('Mic level')).toHaveAttribute('aria-valuenow', '50');
    expect(meter('Call audio level')).toHaveAttribute('aria-valuenow', '25');
    const fill = meter('Mic level').firstElementChild as HTMLElement;
    expect(parseFloat(fill.style.height)).toBeCloseTo(50, 0);

    pushLevels!({ mic: 1, system: 0.5 });
    step();
    expect(meter('Mic level')).toHaveAttribute('aria-valuenow', '75');
  });

  it('never reports a level outside 0–100', () => {
    renderMeter('both');
    pushLevels!({ mic: 4, system: -3 });
    step();
    expect(meter('Mic level').getAttribute('aria-valuenow')).toBe('100');
    expect(meter('Call audio level').getAttribute('aria-valuenow')).toBe('8');
  });

  it('dims the bars and ignores levels while no audio is flowing', () => {
    renderMeter('both', false);
    pushLevels!({ mic: 1, system: 1 });
    step();
    const fill = meter('Mic level').firstElementChild as HTMLElement;
    expect(fill.style.opacity).toBe('0.2');
    expect(meter('Mic level')).toHaveAttribute('aria-valuenow', '8');
  });

  it('shows one bar per recorded source', () => {
    renderMeter('mic');
    expect(screen.getAllByRole('meter', { hidden: true })).toHaveLength(1);
  });

  it('stops the render loop when it unmounts', () => {
    const view = render(
      <LanguageContext.Provider value="en">
        <LevelMeter mode="both" active />
      </LanguageContext.Provider>,
    );
    step();
    expect(frames.length).toBe(1);
    view.unmount();
    expect(cancelled).toBe(1);
    expect(pushLevels).toBeNull();
  });
});
