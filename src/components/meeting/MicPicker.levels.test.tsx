// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEVICES, stubDevices, withMode } from './MicPicker.testSupport';

describe('MicPicker level bars', () => {
  it('shows a vertical mic bar and a call bar in both mode, filling by height rather than width', () => {
    stubDevices(DEVICES);
    render(withMode('both'));
    const meters = screen.getAllByRole('meter', { hidden: true });
    expect(meters.map((m) => m.getAttribute('aria-label'))).toEqual(['Mic level', 'Call audio level']);
    for (const m of meters) {
      expect(m).toHaveAttribute('aria-valuemin', '0');
      expect(m).toHaveAttribute('aria-valuemax', '100');
      expect((m.firstElementChild as HTMLElement).style.height).toBe('8%');
    }
  });

  it('shows only the mic bar in mic-only mode', () => {
    stubDevices(DEVICES);
    render(withMode('mic'));
    expect(screen.getAllByRole('meter', { hidden: true })).toHaveLength(1);
  });
});
