// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DIARIZATION_REGISTRY_KEY,
  LANGID_REGISTRY_KEY,
  SEARCH_REGISTRY_KEY,
} from '@/lib/asr/browser/model-registry-known-keys';
import {
  acceptAck,
  entry,
  initiateDownloads,
  recordConsent,
  registerOnboardingTestEnv,
  setEntries,
} from './OnboardingDialog.testSupport';
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
  acceptAck();
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
    expect(cont()).toBeDisabled();
  });

  it('accepting in onboarding grants search consent, so no separate dialog is needed', async () => {
    const real = await vi.importActual<typeof import('@/lib/asr/browser/model-registry-consent')>(
      '@/lib/asr/browser/model-registry-consent',
    );
    allModels('not-downloaded');
    openModelsStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    const [choice, keys] = recordConsent.mock.calls[0] as ['accepted', string[]];
    real.recordConsent(choice, keys);
    expect(real.isConsentGiven(SEARCH_REGISTRY_KEY)).toBe(true);
    real.resetConsent();
  });

  const cont = () => screen.getByRole('button', { name: 'Continue' });

  it('disables Continue before download, explains why, and keeps Back enabled', () => {
    allModels('not-downloaded');
    openModelsStep();
    expect(cont()).toBeDisabled();
    expect(cont()).toHaveAttribute('aria-disabled', 'true');
    const hint = document.getElementById(cont().getAttribute('aria-describedby') ?? '');
    expect(hint).toHaveTextContent('This download is required to continue.');
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Continue anyway' })).not.toBeInTheDocument();
  });

  it('disables Continue during download and shows the percent', () => {
    allModels('downloading', 'downloading');
    openModelsStep();
    expect(cont()).toBeDisabled();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('keeps the download running when going back', () => {
    allModels('downloading', 'downloading');
    openModelsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });

  it('says the models are ready and enables Continue when all are cached', () => {
    allModels('cached', 'cached');
    openModelsStep();
    expect(screen.getByText('Step 4 of 8')).toBeInTheDocument();
    expect(screen.getByText('The speech models are ready.')).toBeInTheDocument();
    expect(cont()).toBeEnabled();
    expect(initiateDownloads).not.toHaveBeenCalled();
    fireEvent.click(cont());
    expect(screen.getByText('Step 5 of 8')).toBeInTheDocument();
  });
});
