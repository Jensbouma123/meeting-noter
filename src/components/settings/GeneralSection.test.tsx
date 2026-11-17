// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { DEFAULT_SETTINGS } from '@/components/meeting/settingsStorage';
import { GeneralSection } from './GeneralSection';

vi.mock('./AudioCaptureSection', () => ({ AudioCaptureSection: () => null }));

const originalLanguage = Object.getOwnPropertyDescriptor(window.navigator, 'language');

function setBrowserLanguage(value: string) {
  Object.defineProperty(window.navigator, 'language', { value, configurable: true });
}

function renderGeneral(language: string) {
  return render(
    <LanguageContext.Provider value="en">
      <GeneralSection
        settings={{ ...DEFAULT_SETTINGS, language }}
        onSettingsChange={() => {}}
      />
    </LanguageContext.Provider>,
  );
}

function uiLanguageValue() {
  return screen.getByRole('combobox', { name: 'Interface language' });
}

beforeEach(() => setBrowserLanguage('en-US'));
afterEach(() => {
  cleanup();
  if (originalLanguage) Object.defineProperty(window.navigator, 'language', originalLanguage);
});

describe('GeneralSection UI language', () => {
  it('reflects the stored language', () => {
    renderGeneral('nl');
    expect(uiLanguageValue()).toHaveTextContent('Nederlands');
  });

  it('derives the default from the browser language when none is stored', () => {
    setBrowserLanguage('nl-NL');
    renderGeneral('');
    expect(uiLanguageValue()).toHaveTextContent('Nederlands');
  });

  it('defaults to English for a non-Dutch browser when none is stored', () => {
    renderGeneral('');
    expect(uiLanguageValue()).toHaveTextContent('English');
  });
});
