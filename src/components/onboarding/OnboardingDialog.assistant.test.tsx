// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { entry, OnboardingDialogHarness as OnboardingDialog, registerOnboardingTestEnv, setEntries } from './OnboardingDialog.testSupport';

registerOnboardingTestEnv();
afterEach(() => vi.unstubAllGlobals());

const LIST = {
  assistants: [
    { id: 'claude-desktop', status: 'not-connected', canAutoConnect: true, manualCommand: null, configPath: '/cfg.json' },
    { id: 'claude-code', status: 'not-found', canAutoConnect: false, manualCommand: null, configPath: null },
    { id: 'codex', status: 'connected', canAutoConnect: false, manualCommand: null, configPath: null },
  ],
};

function stubFetch(list: Promise<unknown>) {
  const fn = vi.fn(async (url: string) => {
    if (url === '/api/assistants') return { ok: true, json: () => list };
    return { ok: true, json: async () => ({ ok: true, status: 'connected' }) };
  });
  vi.stubGlobal('fetch', fn);
}

const next = () => screen.getByRole('button', { name: 'Continue' });
function openAssistantStep() {
  setEntries({ asr: entry('cached') });
  render(<OnboardingDialog />);
  fireEvent.click(next());
  fireEvent.click(next());
  expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
}

describe('assistant onboarding step', () => {
  it('waits for detection, then offers connect and the restart notice', async () => {
    let resolve!: (v: unknown) => void;
    stubFetch(new Promise((r) => (resolve = r)));
    openAssistantStep();
    expect(screen.getByText(/Looking for AI assistants/)).toBeInTheDocument();
    expect(next()).toBeDisabled();
    resolve(LIST);
    const connect = await screen.findByRole('button', { name: 'Connect' });
    expect(next()).toBeEnabled();
    expect(screen.getByText(/Install the app|Not found yet/)).toBeInTheDocument();
    fireEvent.click(connect);
    await waitFor(() => expect(screen.getAllByText(/Quit Claude Desktop completely/).length).toBeGreaterThan(0));
  });

  it('can be skipped from the step', async () => {
    stubFetch(Promise.resolve(LIST));
    openAssistantStep();
    fireEvent.click(screen.getByRole('button', { name: /Skip, I'll do this later/ }));
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
  });

  it('does not block when detection fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    openAssistantStep();
    expect(await screen.findByText(/Could not check your assistants/)).toBeInTheDocument();
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
  });

  it('mentions the search model when it is not downloaded', async () => {
    stubFetch(Promise.resolve(LIST));
    setEntries({ asr: entry('cached'), 'search-embeddinggemma2': { ...entry('not-downloaded'), key: 'search-embeddinggemma2' } });
    render(<OnboardingDialog />);
    fireEvent.click(next());
    fireEvent.click(next());
    fireEvent.click(next());
    expect(await screen.findByText(/Search & insights model/)).toBeInTheDocument();
  });
});
