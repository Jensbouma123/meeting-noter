// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    entries: {
      'parakeet-ttd': {
        key: 'parakeet-ttd',
        modelRepo: 'org/repo',
        displayName: 'Parakeet',
        estimatedSizeBytes: 5000,
        backend: 'webgpu',
        status: 'downloading',
        progress: {
          loadedBytes: 2500,
          totalBytes: 5000,
          currentFile: 'encoder-model.onnx',
          throughputBytesPerSec: 10,
          etaSeconds: 60,
          percent: 50,
        },
        error: null,
        wasCancelled: false,
        isReady: false,
      },
    },
    dialogVisible: false,
    consentState: null,
    activeBackend: 'webgpu',
  };
  return {
    state,
    deleteDownloadedModels: vi.fn(),
    resetBrowserASR: vi.fn(),
  };
});

vi.mock('@/lib/asr/browser', () => ({
  subscribeRegistry: () => () => {},
  getState: () => mocks.state,
  getServerSnapshot: () => mocks.state,
  retryDownload: vi.fn(),
  openDialog: vi.fn(),
  deleteDownloadedModels: mocks.deleteDownloadedModels,
  formatBytes: (n: number) => `${n} B`,
  formatSeconds: (n: number) => `${n}s`,
}));

vi.mock('@/lib/meeting/browser-asr', () => ({
  resetBrowserASR: mocks.resetBrowserASR,
}));

vi.mock('./preparation/ModelPreparationBar', () => ({ ModelPreparationBar: () => null }));

vi.mock('./preparation/describePreparation', () => ({ isPreparing: () => true }));

vi.mock('./preparation/useModelPreparation', () => ({
  useModelPreparation: () => ({
    asrEntry: undefined,
    downloadPercent: 50,
    downloadLoadedBytes: 2500,
    downloadTotalBytes: 5000,
    engine: { phase: 'downloading', stage: 'downloading', percent: null, detail: null },
    snapshot: { registry: null, engine: null },
  }),
}));

import { SpeechModelSettings } from './SpeechModelSettings';

describe('DeleteDownloadedModels mid-download', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    mocks.deleteDownloadedModels.mockReset().mockResolvedValue({ deleted: true });
    mocks.resetBrowserASR.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('is enabled mid-download and offers to cancel the download', () => {
    render(<SpeechModelSettings />);

    const button = screen.getByRole('button', { name: /cancel and delete download/i });
    expect(button).toBeEnabled();
    expect(screen.getByText(/part of the model is downloaded/i)).toBeInTheDocument();
  });

  it('clicking resets the engine, aborts the download and deletes the cache', async () => {
    render(<SpeechModelSettings />);

    fireEvent.click(screen.getByRole('button', { name: /cancel and delete download/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^delete models$/i }));

    await waitFor(() => expect(mocks.deleteDownloadedModels).toHaveBeenCalledTimes(1));
    expect(mocks.resetBrowserASR).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/models deleted/i)).toBeInTheDocument();
  });
});
