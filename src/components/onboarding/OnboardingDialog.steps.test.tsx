// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/store';
import { getVocabulary } from '@/lib/vocabulary/store';
import {
  OnboardingDialogHarness as OnboardingDialog,
  entry,
  initiateDownloads,
  lastSettings,
  recordConsent,
  setEntries,
  useOnboardingTestEnv,
} from './OnboardingDialog.testSupport';

useOnboardingTestEnv();

const clickContinue = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

describe('OnboardingDialog steps', () => {
  it('asks to download the models and starts the shared download', async () => {
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', ['asr']);
    expect(initiateDownloads).toHaveBeenCalled();
    act(() => setEntries({ asr: entry('downloading') }));
    expect(screen.getByRole('status')).toHaveTextContent('50%');
    clickContinue();
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
  });

  it('saves the owner name, and lets you leave it empty', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jens' } });
    expect(lastSettings.current.ownerName).toBe('Jens');
    expect(screen.getByLabelText('Your name')).toHaveValue('Jens');
  });

  it('skips the download step when the models are already there', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });

  it('saves the words and ends on where to find them', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    clickContinue();
    clickContinue();
    const field = screen.getByLabelText('Add a word');
    expect(field).toHaveAttribute('placeholder', 'Framna');
    fireEvent.change(field, { target: { value: 'Framna, Hezelaer' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer']);
    expect(screen.getByText('On your list: Framna, Hezelaer')).toBeInTheDocument();
    clickContinue();
    expect(screen.getByText(/Settings → Vocabulary/)).toBeInTheDocument();
    expect(screen.getByText(/Fix this word/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start using Meeting Noter' }));
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });
});
