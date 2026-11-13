// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatBytes, initRegistry, registerModel } from '@/lib/asr/browser';
import { isConsentGiven } from '@/lib/asr/browser/model-registry-consent';
import { setDialogVisible } from '@/lib/asr/browser/model-registry-dialog';
import { registerSearchModel, SEARCH_MODEL_SIZE_BYTES } from '@/lib/semantic-search/model-registry';
import { ModelConsentDialog } from './ModelConsentDialog';

vi.mock('@/lib/asr/browser/browser-asr-download-run', () => ({ downloadEntryFiles: vi.fn(async () => undefined) }));
vi.mock('../preparation/useModelPreparation', () => ({ useModelPreparation: () => ({ engine: { stage: null } }) }));
vi.mock('@/lib/asr/browser/model-manifest-size-probe', () => ({ probeModelSize: async () => null }));

const MB = 1_000_000;

describe('model consent dialog', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', undefined);
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    localStorage.clear();
    initRegistry();
    for (const [key, name, bytes] of [
      ['asr-x', 'Parakeet', 600 * MB],
      ['diarization-turns', 'Speaker detection', 30 * MB],
      ['langid-whisper-tiny', 'Language detection', 40 * MB],
    ] as const) {
      registerModel({ key, modelRepo: key, displayName: name, estimatedSizeBytes: bytes, backend: 'wasm', description: '' });
    }
    registerSearchModel();
    setDialogVisible(true);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lists the search model as a fourth item and includes it in the total', () => {
    render(<ModelConsentDialog />);
    expect(screen.getByText('Search & insights')).toBeInTheDocument();
    expect(screen.getByText('Parakeet')).toBeInTheDocument();
    const total = 670 * MB + SEARCH_MODEL_SIZE_BYTES;
    expect(screen.getByRole('button', { name: `Download ${formatBytes(total)}` })).toBeInTheDocument();
    expect(screen.getByText(formatBytes(SEARCH_MODEL_SIZE_BYTES))).toBeInTheDocument();
  });

  it('the download button starts the search model download too', async () => {
    const { downloadEntryFiles } = await import('@/lib/asr/browser/browser-asr-download-run');
    render(<ModelConsentDialog />);
    fireEvent.click(screen.getByRole('button', { name: /Download/ }));
    expect(isConsentGiven('search-embeddinggemma2')).toBe(true);
    await vi.waitFor(() => expect(vi.mocked(downloadEntryFiles).mock.calls.map((c) => c[0])).toContain('search-embeddinggemma2'));
  });
});
