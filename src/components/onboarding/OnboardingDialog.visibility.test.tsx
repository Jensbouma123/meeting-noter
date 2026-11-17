// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ONBOARDING_STORAGE_KEY, openOnboarding, restartOnboarding } from '@/lib/onboarding/store';
import { addVocabularyEntries, getVocabulary } from '@/lib/vocabulary/store';
import {
  entry,
  setEntries,
  registerOnboardingTestEnv,
  acceptAckPastModels,
} from './OnboardingDialog.testSupport';
import { OnboardingDialog } from './OnboardingDialog';

registerOnboardingTestEnv();

describe('OnboardingDialog visibility', () => {
  it('shows on first run with the welcome step', () => {
    render(<OnboardingDialog />);
    expect(screen.getByText(/stays on this Mac|processed on this Mac/)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
  });

  it('does not show again once it was seen', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(<OnboardingDialog />);
    expect(screen.queryByText('Step 1 of 8')).not.toBeInTheDocument();
  });

  it('can be forced with ?onboarding=1 and reopened from Settings', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    window.history.pushState({}, '', '/?onboarding=1');
    const { unmount } = render(<OnboardingDialog />);
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    unmount();
    window.history.pushState({}, '', '/');
    render(<OnboardingDialog />);
    expect(screen.queryByText('Step 1 of 8')).not.toBeInTheDocument();
    act(() => openOnboarding());
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
  });

  it('restart opens at step 1 again, keeping saved words and the name', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    addVocabularyEntries([{ word: 'Framna', variants: [] }]);
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    expect(screen.queryByText('Step 1 of 8')).not.toBeInTheDocument();
    act(() => restartOnboarding());
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    acceptAckPastModels();
    fireEvent.click(screen.getByRole('button', { name: /Skip, I'll do this later/ }));
    expect(screen.getByText('On your list: Framna')).toBeInTheDocument();
    expect(getVocabulary().entries).toHaveLength(1);
  });

  it('skip closes a reopened onboarding in one click and remembers it', () => {
    render(<OnboardingDialog />);
    act(() => restartOnboarding());
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.queryByText('Step 1 of 8')).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });
});
