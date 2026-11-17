// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadSettings } from '@/components/meeting/settingsStorage';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { onboarding } from '@/lib/i18n/ns/onboarding';
import { ACK_STORAGE_KEY, AUTOCLOSE_STORAGE_KEY, ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/store';
import { getVocabulary } from '@/lib/vocabulary/store';
import { STEPS } from './constants';
import {
  entry,
  initiateDownloads,
  recordConsent,
  setEntries,
  registerOnboardingTestEnv,
  acceptAck,
  acceptAckPastModels,
  acceptAutoClose,
} from './OnboardingDialog.testSupport';
import { OnboardingDialog } from './OnboardingDialog';

registerOnboardingTestEnv();

const skipAssistants = () => fireEvent.click(screen.getByRole('button', { name: /Skip, I'll do this later/ }));
const clickContinue = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
const advance = (n: number) => Array.from({ length: n }).forEach(clickContinue);
const renderWithI18n = () =>
  render(
    <I18nProvider>
      <OnboardingDialog />
    </I18nProvider>,
  );

describe('OnboardingDialog steps', () => {
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

  it('asks to download the models and starts the shared download', async () => {
    render(<OnboardingDialog />);
    advance(3);
    acceptAck();
    expect(screen.getByText('Step 5 of 9')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', ['asr']);
    expect(initiateDownloads).toHaveBeenCalled();
    act(() => setEntries({ asr: entry('downloading') }));
    expect(screen.getByRole('status')).toHaveTextContent('50%');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('saves the owner name, and lets you leave it empty', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    advance(2);
    expect(screen.getByText('Step 3 of 9')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jens' } });
    expect(loadSettings().ownerName).toBe('Jens');
    expect(screen.getByLabelText('Your name')).toHaveValue('Jens');
  });

  it('does not download when the models are already there', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    advance(3);
    acceptAckPastModels();
    expect(screen.getByText('Step 6 of 9')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });

  it('blocks Continue on the acknowledgement until it is checked, and persists it', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    advance(3);
    expect(screen.getByText('Step 4 of 9')).toBeInTheDocument();
    const box = screen.getByRole('checkbox', { name: /I understand: all data is processed locally/ });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull();
    fireEvent.click(box);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    clickContinue();
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('1');
    expect(screen.getByText('Step 5 of 9')).toBeInTheDocument();
  });

  it('saves the words and ends on where to find them', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    advance(3);
    acceptAckPastModels();
    skipAssistants();
    const field = screen.getByLabelText('Add a word');
    expect(field).toHaveAttribute('placeholder', 'Framna');
    fireEvent.change(field, { target: { value: 'Framna, Hezelaer' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer']);
    expect(screen.getByText('On your list: Framna, Hezelaer')).toBeInTheDocument();
    clickContinue();
    expect(screen.getByAltText('The Meeting Noter app icon')).toHaveAttribute('src', '/brand/meeting-noter-icon.png');
    expect(screen.getByText(/within about 15 seconds/)).toBeInTheDocument();
    expect(screen.getByText(/after 2 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/up to 15 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Spotlight \(Cmd\+Space\)/)).toBeInTheDocument();
    acceptAutoClose();
    expect(screen.getByText(/Settings → Vocabulary/)).toBeInTheDocument();
    expect(screen.getByText(/Fix this word/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start using Meeting Noter' }));
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });

  it('blocks Continue on the auto-close step until its checkbox is checked, and persists it', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    advance(3);
    acceptAckPastModels();
    skipAssistants();
    clickContinue();
    const box = screen.getByLabelText(/I understand that Meeting Noter closes itself/);
    expect(box).toHaveAttribute('type', 'checkbox');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(localStorage.getItem(AUTOCLOSE_STORAGE_KEY)).toBeNull();
    fireEvent.click(box);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    clickContinue();
    expect(localStorage.getItem(AUTOCLOSE_STORAGE_KEY)).toBe('1');
  });
});
