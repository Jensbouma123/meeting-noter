// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  openOnboarding,
  restartOnboarding,
  resetOnboardingForTests,
} from '@/lib/onboarding/store';
import { addVocabularyEntries, getVocabulary, resetVocabularyForTests } from '@/lib/vocabulary/store';

const registry = vi.hoisted(() => ({
  entries: {} as Record<string, unknown>,
  listeners: new Set<() => void>(),
  snapshot: { entries: {} as Record<string, unknown>, dialogVisible: false, consentState: null },
}));

function setEntries(entries: Record<string, unknown>) {
  registry.snapshot = { ...registry.snapshot, entries };
  for (const fn of registry.listeners) fn();
}

const entry = (status: string) => ({
  key: 'asr',
  status,
  estimatedSizeBytes: 2_000_000_000,
  progress: { loadedBytes: 500, totalBytes: 1000, percent: 50, throughputBytesPerSec: 0, etaSeconds: 0, currentFile: '' },
});

const recordConsent = vi.fn();
const initiateDownloads = vi.fn(() => Promise.resolve());
const setDialogVisible = vi.fn();

vi.mock('@/lib/asr/browser/model-registry-state', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  subscribeRegistry: (fn: () => void) => {
    registry.listeners.add(fn);
    return () => registry.listeners.delete(fn);
  },
}));
vi.mock('@/lib/asr/browser/model-registry-snapshot', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getState: () => registry.snapshot,
  getServerSnapshot: () => registry.snapshot,
}));
vi.mock('@/lib/asr/browser/model-registry-consent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  recordConsent: (...a: unknown[]) => recordConsent(...a),
}));
vi.mock('@/lib/asr/browser/model-registry-dialog', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setDialogVisible: (...a: unknown[]) => setDialogVisible(...a),
}));
vi.mock('@/lib/asr/browser', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  formatBytes: () => '2 GB',
  initiateDownloads: () => initiateDownloads(),
  retryDownload: vi.fn(() => Promise.resolve()),
  probeRegisteredModelSizes: () => Promise.resolve(),
}));

import { OnboardingDialog as Dialog } from './OnboardingDialog';
import type { AppSettings } from '@/components/meeting/types';
import { DEFAULT_SETTINGS } from '@/components/meeting/settingsStorage';

let lastSettings: AppSettings = DEFAULT_SETTINGS;
function OnboardingDialog() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  return (
    <Dialog
      settings={settings}
      onSettingsChange={(s) => {
        lastSettings = s;
        setSettings(s);
      }}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  resetOnboardingForTests();
  resetVocabularyForTests();
  setEntries({ asr: entry('not-downloaded') });
  lastSettings = DEFAULT_SETTINGS;
  recordConsent.mockClear();
  initiateDownloads.mockClear();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);

describe('OnboardingDialog', () => {
  it('shows on first run with the welcome step', () => {
    render(<OnboardingDialog />);
    expect(screen.getByText(/stays on this Mac|processed on this Mac/)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('does not show again once it was seen', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(<OnboardingDialog />);
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
  });

  it('can be forced with ?onboarding=1 and reopened from Settings', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    window.history.pushState({}, '', '/?onboarding=1');
    const { unmount } = render(<OnboardingDialog />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    unmount();
    window.history.pushState({}, '', '/');
    render(<OnboardingDialog />);
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
    act(() => openOnboarding());
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('restart opens at step 1 again, keeping saved words and the name', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    addVocabularyEntries([{ word: 'Framna', variants: [] }]);
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
    act(() => restartOnboarding());
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('On your list: Framna')).toBeInTheDocument();
    expect(getVocabulary().entries).toHaveLength(1);
  });

  it('skip closes it in one click and remembers it', () => {
    render(<OnboardingDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.queryByText('Step 1 of 5')).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });

  it('asks to download the models and starts the shared download', async () => {
    render(<OnboardingDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', ['asr']);
    expect(initiateDownloads).toHaveBeenCalled();
    act(() => setEntries({ asr: entry('downloading') }));
    expect(screen.getByRole('status')).toHaveTextContent('50%');
    // Can continue while it downloads.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
  });

  it('saves the owner name, and lets you leave it empty', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jens' } });
    expect(lastSettings.ownerName).toBe('Jens');
    expect(screen.getByLabelText('Your name')).toHaveValue('Jens');
  });

  it('skips the download step when the models are already there', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });

  it('saves the words and ends on where to find them', () => {
    setEntries({ asr: entry('cached') });
    render(<OnboardingDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const field = screen.getByLabelText('Add a word');
    expect(field).toHaveAttribute('placeholder', 'Framna');
    fireEvent.change(field, { target: { value: 'Framna, Hezelaer' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(getVocabulary().entries.map((e) => e.word)).toEqual(['Framna', 'Hezelaer']);
    expect(screen.getByText('On your list: Framna, Hezelaer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Settings → Vocabulary/)).toBeInTheDocument();
    expect(screen.getByText(/Fix this word/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start using Meeting Noter' }));
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });
});
