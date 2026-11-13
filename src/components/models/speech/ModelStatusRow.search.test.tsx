// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelEntry } from '@/lib/asr/browser';
import { ModelStatusRow } from './ModelStatusRow';

vi.mock('@/lib/asr/browser', async (orig) => ({
  ...(await orig<object>()),
  openDialog: vi.fn(),
  retryDownload: vi.fn(),
}));

const base: ModelEntry = {
  key: 'search-embeddinggemma2',
  modelRepo: 'x',
  displayName: 'Search & insights',
  estimatedSizeBytes: 200_000_000,
  backend: 'webgpu',
  kind: 'search',
  status: 'not-downloaded',
  progress: { loadedBytes: 0, totalBytes: 200_000_000, currentFile: '', throughputBytesPerSec: 0, etaSeconds: 0, percent: 0 },
  error: null,
  wasCancelled: false,
  isReady: false,
};
const prep = { engine: { stage: null } } as never;

function show(patch: Partial<ModelEntry>) {
  render(<ModelStatusRow entry={{ ...base, ...patch }} preparation={prep} />);
}

describe('Search & insights card', () => {
  afterEach(cleanup);

  it('not downloaded: description, size, GPU badge, download button', () => {
    show({});
    expect(screen.getByText('Search & insights')).toBeInTheDocument();
    expect(screen.getByText(/Finds decisions, action items/)).toHaveTextContent(/200/);
    expect(screen.getByText('GPU')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download model' })).toBeInTheDocument();
  });

  it('downloading shows percent', () => {
    show({ status: 'downloading', progress: { ...base.progress, loadedBytes: 100_000_000, percent: 50 } });
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('ready shows badge and CPU on wasm', () => {
    show({ status: 'cached', backend: 'wasm', isReady: true });
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('CPU')).toBeInTheDocument();
  });

  it('error shows retry', () => {
    show({ status: 'failed', error: 'boom' });
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
