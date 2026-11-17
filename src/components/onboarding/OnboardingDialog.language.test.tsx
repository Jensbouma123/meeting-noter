// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadSettings } from '@/components/meeting/settingsStorage';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { onboarding } from '@/lib/i18n/ns/onboarding';
import { STEPS } from './constants';
import { registerOnboardingTestEnv } from './OnboardingDialog.testSupport';
import { OnboardingDialog } from './OnboardingDialog';

registerOnboardingTestEnv();

const clickContinue = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
const renderWithI18n = () =>
  render(
    <I18nProvider>
      <OnboardingDialog />
    </I18nProvider>,
  );

describe('OnboardingDialog language step', () => {
  it('renders language as the first step and matches STEPS length in the step counter', () => {
    expect(STEPS[0]).toBe('language');
    renderWithI18n();
    expect(screen.getByText(onboarding.en['language.title'])).toBeInTheDocument();
    expect(screen.getByText(`Step 1 of ${STEPS.length}`)).toBeInTheDocument();
  });

  it('persists Nederlands and renders the next step in Dutch when chosen', () => {
    renderWithI18n();
    fireEvent.click(screen.getByRole('button', { name: 'Nederlands' }));
    expect(loadSettings().language).toBe('nl');
    fireEvent.click(screen.getByRole('button', { name: onboarding.nl.next }));
    expect(screen.getByText(onboarding.nl['welcome.title'])).toBeInTheDocument();
    expect(screen.getByText(`Stap 2 van ${STEPS.length}`)).toBeInTheDocument();
  });

  it('keeps English when choosing English and navigating Back', () => {
    renderWithI18n();
    fireEvent.click(screen.getByRole('button', { name: 'Nederlands' }));
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(loadSettings().language).toBe('en');
    clickContinue();
    expect(screen.getByText(onboarding.en['welcome.title'])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText(onboarding.en['language.title'])).toBeInTheDocument();
    expect(loadSettings().language).toBe('en');
  });
});
