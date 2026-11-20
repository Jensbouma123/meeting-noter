// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CaptureMode } from '@/lib/meeting';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { CaptureModePicker } from './CaptureModePicker';

afterEach(cleanup);

const ui = (mode: CaptureMode, onChange = vi.fn(), locked = false) => (
  <LanguageContext.Provider value="en">
    <CaptureModePicker mode={mode} locked={locked} onChange={onChange} />
  </LanguageContext.Provider>
);

describe('CaptureModePicker', () => {
  it('shows the current mode on the trigger with a menu chevron', () => {
    render(ui('both'));
    const trigger = screen.getByRole('button', { name: 'Audio source: Mic + call' });
    expect(trigger).toHaveTextContent('Mic + call');
    expect(trigger.querySelectorAll('svg')).toHaveLength(2);
  });

  it('lists both modes with the current one checked', async () => {
    render(ui('mic'));
    fireEvent.click(screen.getByRole('button', { name: 'Audio source: Mic' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(items.map((i) => i.textContent)).toEqual(['Mic', 'Mic + call']);
    expect(items.map((i) => i.getAttribute('aria-current'))).toEqual(['true', null]);
  });

  it('treats the legacy system mode as Mic + call', () => {
    render(ui('system'));
    expect(screen.getByRole('button', { name: 'Audio source: Mic + call' })).toBeInTheDocument();
  });

  it('reports the mode chosen from the menu', async () => {
    const onChange = vi.fn();
    render(ui('both', onChange));
    fireEvent.click(screen.getByRole('button', { name: 'Audio source: Mic + call' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mic', hidden: true }));
    expect(onChange).toHaveBeenCalledWith('mic');
  });

  it('is disabled with an explanatory tooltip while recording', () => {
    render(ui('mic', vi.fn(), true));
    const trigger = screen.getByRole('button', { name: 'Audio source: Mic' });
    expect(trigger).toBeDisabled();
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent(
      'Records your microphone only. Stop recording to change the audio source.',
    );
  });
});
