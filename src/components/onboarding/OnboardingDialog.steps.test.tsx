// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadSettings } from '@/components/meeting/settingsStorage';
import { ACK_STORAGE_KEY, AUTOCLOSE_STORAGE_KEY, ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/store';
import { getVocabulary } from '@/lib/vocabulary/store';
import {
  entry,
  initiateDownloads,
  recordConsent,
  setEntries,
  registerOnboardingTestEnv,
  acceptAck,
  acceptAutoClose,
} from './OnboardingDialog.testSupport';
import { OnboardingDialog } from './OnboardingDialog';

registerOnboardingTestEnv();

const skipAssistants = () => fireEvent.click(screen.getByRole('button', { name: /Skip, I'll do this later/ }));
const clickContinue = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

describe('OnboardingDialog steps', () => {
  it('asks to download the models and starts the shared download', async () => {
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    acceptAck();
    expect(screen.getByText('Step 4 of 8')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', ['asr']);
    expect(initiateDownloads).toHaveBeenCalled();
    act(() => setEntries({ asr: entry('downloading') }));
    expect(screen.getByRole('status')).toHaveTextContent('50%');
    clickContinue();
    expect(screen.getByText('Step 5 of 8')).toBeInTheDocument();
  });

  it('saves the owner name, and lets you leave it empty', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jens' } });
    expect(loadSettings().ownerName).toBe('Jens');
    expect(screen.getByLabelText('Your name')).toHaveValue('Jens');
  });

  it('skips the download step when the models are already there', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    acceptAck();
    expect(screen.getByText('Step 5 of 8')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });

  it('blocks Continue on the acknowledgement until it is checked, and persists it', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
    const box = screen.getByRole('checkbox', { name: /I understand: all data is processed locally/ });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBeNull();
    fireEvent.click(box);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    clickContinue();
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('1');
    expect(screen.getByText('Step 5 of 8')).toBeInTheDocument();
  });

  it('saves the words and ends on where to find them', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    acceptAck();
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
    clickContinue();
    clickContinue();
    acceptAck();
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
