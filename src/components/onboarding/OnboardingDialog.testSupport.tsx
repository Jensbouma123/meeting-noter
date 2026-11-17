import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetOnboardingForTests } from '@/lib/onboarding/store';
import { resetVocabularyForTests } from '@/lib/vocabulary/store';
import { resetSettingsStoreForTests } from '@/components/meeting/settingsStore';

const registry = vi.hoisted(() => ({
  listeners: new Set<() => void>(),
  snapshot: { entries: {} as Record<string, unknown>, dialogVisible: false, consentState: null },
}));

const mocks = vi.hoisted(() => ({
  recordConsent: vi.fn(),
  initiateDownloads: vi.fn(() => Promise.resolve()),
}));
export const recordConsent = mocks.recordConsent;
export const initiateDownloads = mocks.initiateDownloads;

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
  setDialogVisible: vi.fn(),
}));
vi.mock('@/lib/asr/browser', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  formatBytes: () => '2 GB',
  initiateDownloads: () => initiateDownloads(),
  retryDownload: vi.fn(() => Promise.resolve()),
  probeRegisteredModelSizes: () => Promise.resolve(),
}));

export function setEntries(entries: Record<string, unknown>) {
  registry.snapshot = { ...registry.snapshot, entries };
  for (const fn of registry.listeners) fn();
}

export const entry = (status: string) => ({
  key: 'asr',
  status,
  estimatedSizeBytes: 2_000_000_000,
  progress: {
    loadedBytes: 500,
    totalBytes: 1000,
    percent: 50,
    throughputBytesPerSec: 0,
    etaSeconds: 0,
    currentFile: '',
  },
});

export function registerOnboardingTestEnv() {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    resetOnboardingForTests();
    resetVocabularyForTests();
    setEntries({ asr: entry('not-downloaded') });
    resetSettingsStoreForTests();
    window.dispatchEvent(new StorageEvent('storage', { key: 'mn.settings' }));
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
}

export function advanceToAck() {
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

export function acceptAck() {
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand: all data is processed locally/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

export function acceptAutoClose() {
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand that Meeting Noter closes itself/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

export function acceptAckPastModels() {
  acceptAck();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}
