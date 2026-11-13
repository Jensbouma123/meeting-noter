// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ASSISTANT_SEEN_STORAGE_KEY, ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/store';
import { OnboardingDialogHarness as OnboardingDialog, registerOnboardingTestEnv } from './OnboardingDialog.testSupport';

registerOnboardingTestEnv();

const LIST = {
  assistants: [
    { id: 'claude-desktop', status: 'not-connected', canAutoConnect: true, manualCommand: null, configPath: '/cfg.json' },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => LIST })));
});
afterEach(() => vi.unstubAllGlobals());

const title = () => screen.queryByText(/Connect your AI assistant|Koppel je AI-assistent/);

describe('assistant-only onboarding for existing users', () => {
  it('shows the assistant step alone when the earlier onboarding was finished but the assistant never seen', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(<OnboardingDialog />);
    expect(title()).toBeInTheDocument();
    expect(screen.queryByText('Step 1 of 6')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });

  it('closing it with finish remembers it', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(<OnboardingDialog />);
    await screen.findByRole('button', { name: 'Connect' });
    fireEvent.click(screen.getByRole('button', { name: 'Start using Meeting Noter' }));
    expect(title()).not.toBeInTheDocument();
    expect(localStorage.getItem(ASSISTANT_SEEN_STORAGE_KEY)).toBe('1');
  });

  it('skipping it remembers it', async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(<OnboardingDialog />);
    fireEvent.click(await screen.findByRole('button', { name: /Skip, I'll do this later/ }));
    expect(title()).not.toBeInTheDocument();
    expect(localStorage.getItem(ASSISTANT_SEEN_STORAGE_KEY)).toBe('1');
  });

  it('does not show once the assistant was seen', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    localStorage.setItem(ASSISTANT_SEEN_STORAGE_KEY, '1');
    render(<OnboardingDialog />);
    expect(title()).not.toBeInTheDocument();
  });

  it('a new user finishing the full onboarding never gets the assistant-only dialog', () => {
    render(<OnboardingDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(title()).not.toBeInTheDocument();
    expect(localStorage.getItem(ASSISTANT_SEEN_STORAGE_KEY)).toBe('1');
  });
});
