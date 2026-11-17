// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DIARIZATION_REGISTRY_KEY,
  LANGID_REGISTRY_KEY,
  SEARCH_REGISTRY_KEY,
} from '@/lib/asr/browser/model-registry-known-keys';
import { registryState } from '@/lib/asr/browser/model-registry-state';
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

describe('OnboardingDialog models step', () => {
  it('asks consent for speech, speaker detection and language ID, but not for search', async () => {
    allModels('not-downloaded');
    openModelsStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', CORE);
    expect(initiateDownloads).toHaveBeenCalled();
  });

  it('keeps an earlier consent for search when the core models are accepted', async () => {
    registryState.persistedConsent = { decidedAt: 1, choice: 'accepted', acceptedModels: [SEARCH_REGISTRY_KEY] };
    allModels('not-downloaded');
    openModelsStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Download 2 GB' }));
    expect(recordConsent).toHaveBeenCalledWith('accepted', [...CORE, SEARCH_REGISTRY_KEY]);
    registryState.persistedConsent = null;
  });

  it('treats the models as ready when only the optional search model is missing', () => {
    allModels('not-downloaded', 'cached');
    openModelsStep();
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
    expect(initiateDownloads).not.toHaveBeenCalled();
  });
});
