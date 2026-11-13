// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantSection } from './AssistantSection';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

const LIST = {
  assistants: [
    { id: 'claude-desktop', status: 'not-connected', canAutoConnect: true, manualCommand: null, configPath: '/cfg.json' },
    { id: 'claude-code', status: 'connected', canAutoConnect: false, manualCommand: null, configPath: null },
    { id: 'codex', status: 'not-connected', canAutoConnect: false, manualCommand: 'codex mcp add x', configPath: null },
  ],
};

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => ({ ok: true, json: async () => handler(url, init) }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function renderSection(language: 'en' | 'nl' = 'en') {
  return render(<LanguageContext.Provider value={language}><AssistantSection /></LanguageContext.Provider>);
}

describe('AssistantSection', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a labelled placeholder with a logo per assistant while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    renderSection();
    for (const [id, name] of [['claude-desktop', 'Claude Desktop'], ['claude-code', 'Claude Code'], ['codex', 'Codex']]) {
      const card = screen.getByTestId(`assistant-placeholder-${id}`);
      expect(card.getAttribute('aria-label')).toBe(name);
      expect(card.querySelector(`[data-testid="assistant-logo-${id}"]`)?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(screen.getByText('Looking for AI assistants…')).toBeTruthy();
  });

  it('shows the same logos on loaded cards and drops the placeholders', async () => {
    mockFetch(() => LIST);
    renderSection();
    await screen.findByText('Connected');
    expect(screen.queryByTestId('assistant-placeholder-codex')).toBeNull();
    expect(screen.queryByText('Looking for AI assistants…')).toBeNull();
    for (const id of ['claude-desktop', 'claude-code', 'codex']) expect(screen.getByTestId(`assistant-logo-${id}`)).toBeTruthy();
  });

  it('shows statuses per assistant', async () => {
    mockFetch(() => LIST);
    renderSection();
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(screen.getAllByText('Not connected')).toHaveLength(2);
    expect(screen.getByText('Copy command')).toBeTruthy();
  });

  it('desktop connect asks for confirmation with backup path, then connects', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url === '/api/assistants') return LIST;
      const confirmed = JSON.parse(String(init?.body)).confirm;
      return confirmed ? { ok: true, status: 'connected' } : { needsConfirm: true, configPath: '/cfg.json', backupPath: '/cfg.bak' };
    });
    renderSection();
    fireEvent.click((await screen.findAllByText('Connect'))[0]);
    expect(await screen.findByText('/cfg.bak')).toBeTruthy();
    fireEvent.click(screen.getByText('Yes, connect'));
    await waitFor(() => expect(screen.getAllByText('Connected')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith('/api/assistants/claude-desktop/connect', expect.objectContaining({ method: 'POST' }));
  });

  it('disconnects and renders Dutch', async () => {
    mockFetch((url) => (url === '/api/assistants' ? LIST : { ok: true, status: 'not-connected' }));
    renderSection('nl');
    fireEvent.click(await screen.findByText('Ontkoppelen'));
    await waitFor(() => expect(screen.queryByText('Gekoppeld')).toBeNull());
  });

  it('copies example questions', async () => {
    mockFetch(() => LIST);
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderSection();
    await screen.findByText('Connected');
    expect(screen.queryByText('Copy')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Summarize the meeting I have open'));
    expect(await screen.findByTestId('copied-icon')).toBeTruthy();
  });

  it('shows Repair for an assistant whose MCP file is missing', async () => {
    const fetchMock = mockFetch((url) =>
      url === '/api/assistants'
        ? { assistants: [{ id: 'claude-code', status: 'needs-repair', canAutoConnect: true, manualCommand: null, configPath: null }] }
        : { ok: true, status: 'connected' },
    );
    renderSection();
    expect(await screen.findByText('Needs repair')).toBeTruthy();
    fireEvent.click(screen.getByText('Repair'));
    await waitFor(() => expect(screen.getByText('Connected')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/assistants/claude-code/connect', expect.objectContaining({ method: 'POST' }));
  });

  it('puts Advanced details inside the assistant row and toggles it', async () => {
    mockFetch(() => LIST);
    const { container } = renderSection();
    await screen.findByText('Connected');
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(2);
    const row = details[0].parentElement as HTMLElement;
    expect(row.textContent).toContain('Claude Desktop');
    expect(details[0].closest('div.p-4')).toBeTruthy();
    const summary = details[0].querySelector('summary') as HTMLElement;
    expect(summary.textContent).toBe('Advanced details');
    expect(details[0].open).toBe(false);
    details[0].open = true;
    expect(screen.getByText('/cfg.json')).toBeTruthy();
    expect(details[0].open).toBe(true);
  });
});
