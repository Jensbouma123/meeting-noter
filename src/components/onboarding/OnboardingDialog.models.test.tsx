// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DIARIZATION_REGISTRY_KEY,
  LANGID_REGISTRY_KEY,
  SEARCH_REGISTRY_KEY,
} from '@/lib/asr/browser/model-registry-known-keys';
import { entry, initiateDownloads, recordConsent, registerOnboardingTestEnv, setEntries } from './OnboardingDialog.testSupport';
import { OnboardingDialog } from './OnboardingDialog';

registerOnboardingTestEnv();

const keyed = (key: string, status: string) => ({ ...entry(status), key });
const CORE = ['parakeet-ttd', DIARIZATION_REGISTRY_KEY, LANGID_REGISTRY_KEY];

function allModels(searchStatus: string, coreStatus = 'not-downloaded') {
  setEntries({
    ...Object.fromEntries(CORE.map((k) => [k, keyed(k, coreStatus)])),
    [SEARCH_REGISTRY_KEY]: keyed(SEARCH_REGISTRY_KEY, searchStatus),
  });
}

function openModelsStep() {
  render(<OnboardingDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

const ALL = [...CORE, SEARCH_REGISTRY_KEY];

describe('OnboardingDialog models step', () => {
  it('lists search with the others and records one consent for all four', async () => {
    allModels('not-downloaded');
    openModelsStep();
    expect(await screen.findByText(/search/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', ALL);
    expect(initiateDownloads).toHaveBeenCalled();
  });

  it('includes search in the total size and keeps the step open while it is missing', async () => {
    allModels('not-downloaded', 'cached');
    openModelsStep();
    expect(await screen.findByRole('button', { name: 'Download 2 GB' })).toBeInTheDocument();
    expect(screen.queryByText('Step 4 of 6')).not.toBeInTheDocument();
  });

  it('accepting in onboarding grants search consent, so no separate dialog is needed', async () => {
    const real = await vi.importActual<typeof import('@/lib/asr/browser/model-registry-consent')>(
      '@/lib/asr/browser/model-registry-consent',
    );
    allModels('not-downloaded');
    openModelsStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    const [choice, keys] = recordConsent.mock.calls[0] as [ 'accepted', string[] ];
    real.recordConsent(choice, keys);
    expect(real.isConsentGiven(SEARCH_REGISTRY_KEY)).toBe(true);
    real.resetConsent();
  });

  it('moves on without downloading when every model, search included, is cached', () => {
    allModels('cached', 'cached');
    openModelsStep();
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });
});
