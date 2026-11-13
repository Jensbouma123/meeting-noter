// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NewSessionDialog } from './NewSessionDialog';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function start(language: 'en' | 'nl' = 'en') {
  const onCreate = vi.fn();
  const dialog = <NewSessionDialog open onClose={() => {}} onCreate={onCreate} />;
  render(<LanguageContext.Provider value={language}>{dialog}</LanguageContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: language === 'nl' ? 'Starten' : 'Start' }));
  return onCreate;
}

describe('NewSessionDialog', () => {
  it('puts initial focus on the name input when the dialog opens, not on Annuleren', () => {
    const ui = (open: boolean) => (
      <LanguageContext.Provider value="en">
        <NewSessionDialog open={open} onClose={() => {}} onCreate={() => {}} />
      </LanguageContext.Provider>
    );
    const { rerender } = render(ui(false));
    rerender(ui(true));
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveFocus();
  });

  it('starts the Starten button text-only, without an icon', () => {
    render(
      <LanguageContext.Provider value="nl">
        <NewSessionDialog open onClose={() => {}} onCreate={() => {}} />
      </LanguageContext.Provider>,
    );
    const start = screen.getByRole('button', { name: 'Starten' });
    expect(start.querySelector('svg')).toBeNull();
  });

  it('starts a meeting with a localized default name when left blank', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const onCreate = start('en');
    expect(onCreate).toHaveBeenCalledWith('', expect.stringMatching(/^Meeting \w{3}, \w{3} \d{1,2}, \d{2}:\d{2}$/));
  });

  it('names the meeting in the interface language, not the browser language', () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const onCreate = start('nl');
    const title = onCreate.mock.calls[0][1] as string;
    expect(title).toMatch(/(ma|di|wo|do|vr|za|zo)[ .,]/);
    expect(title).not.toMatch(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
  });
});
