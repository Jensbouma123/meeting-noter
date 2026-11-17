// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { restartOnboarding, shouldShowOnboarding } from '@/lib/onboarding/store';
import { acceptAck, acceptAutoClose, entry, registerOnboardingTestEnv, setEntries } from './OnboardingDialog.testSupport';
import { OnboardingDialog } from './OnboardingDialog';

registerOnboardingTestEnv();

const dialog = () => screen.getByRole('dialog', { hidden: true });
const closeButton = () => dialog().querySelector('[data-dialog-close]') as HTMLElement;
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

function toModelsStep() {
  render(<OnboardingDialog />);
  next();
  next();
  acceptAck();
}

describe('mandatory first-run onboarding', () => {
  it('hides the close button and offers no skip', () => {
    render(<OnboardingDialog />);
    expect(dialog().className).toContain('[&_[data-dialog-close]]:hidden');
    expect(screen.queryByRole('button', { name: 'Skip for now' })).not.toBeInTheDocument();
  });

  it('ignores Escape and backdrop clicks', () => {
    render(<OnboardingDialog />);
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(dialog(), cancel);
    expect(cancel.defaultPrevented).toBe(true);
    dialog().getBoundingClientRect = () => ({ top: 10, left: 10, right: 20, bottom: 20 }) as DOMRect;
    fireEvent.click(dialog(), { clientX: 0, clientY: 0 });
    expect(shouldShowOnboarding()).toBe(true);
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
  });

  it('closes only after the last step is finished', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    next();
    next();
    acceptAck();
    fireEvent.click(screen.getByRole('button', { name: /Skip, I'll do this later/ }));
    next();
    acceptAutoClose();
    expect(shouldShowOnboarding()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start using Meeting Noter' }));
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('keeps a way forward after a failed download', () => {
    setEntries({ asr: entry('failed') });
    toModelsStep();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
    expect(screen.getByText('Step 5 of 8')).toBeInTheDocument();
  });

  it('lets an offline user continue without downloading', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    toModelsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
    expect(screen.getByText('Step 5 of 8')).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('stays closable when reopened from settings', () => {
    localStorage.setItem('mn.onboarding.done', '1');
    render(<OnboardingDialog />);
    act(() => restartOnboarding());
    expect(dialog().className).not.toContain('[&_[data-dialog-close]]:hidden');
    expect(closeButton()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(shouldShowOnboarding()).toBe(false);
  });
});
