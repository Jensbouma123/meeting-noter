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

const checked = () => screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'));

describe('CaptureModePicker', () => {
  it('offers two explained cards under "What to record", the current one checked', () => {
    render(ui('mic'));
    const group = screen.getByRole('radiogroup', { name: 'What to record' });
    const radios = screen.getAllByRole('radio');
    expect(group).toContainElement(radios[0]);
    expect(radios[0]).toHaveTextContent('Mic only');
    expect(radios[0]).toHaveTextContent('Only your microphone');
    expect(radios[1]).toHaveTextContent('Mic + call');
    expect(radios[1]).toHaveTextContent('call audio of the other people');
    expect(checked()).toEqual(['true', 'false']);
  });

  it('treats the legacy system mode as Mic + call', () => {
    render(ui('system'));
    expect(checked()).toEqual(['false', 'true']);
  });

  it('reports the picked card and ignores a click on the current one', () => {
    const onChange = vi.fn();
    render(ui('both', onChange));
    fireEvent.click(screen.getByRole('radio', { name: /Mic \+ call/ }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /Mic only/ }));
    expect(onChange).toHaveBeenCalledWith('mic');
  });

  it('is locked while recording and says why', () => {
    const onChange = vi.fn();
    render(ui('mic', onChange, true));
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Mic \+ call/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radiogroup')).toHaveAccessibleDescription(
      'Locked while recording. Stop recording to change what is recorded.',
    );
  });
});
