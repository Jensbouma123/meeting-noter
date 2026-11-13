// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantSection } from './AssistantSection';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

const LIST = {
  assistants: [
    { id: 'claude-desktop', status: 'not-connected', canAutoConnect: true, manualCommand: null, configPath: '/cfg.json' },
    { id: 'claude-code', status: 'not-connected', canAutoConnect: true, manualCommand: null, configPath: null },
    { id: 'codex', status: 'not-connected', canAutoConnect: true, manualCommand: null, configPath: null },
  ],
};

const NOTICES: Array<[string, string]> = [
  ['Claude Desktop', 'Quit Claude Desktop completely (Cmd+Q) and reopen it.'],
  ['Claude Code', "Start a new Claude Code session; sessions already open won't see it."],
  ['Codex', "Start a new Codex session; sessions already open won't see it."],
];

describe('AssistantSection restart notice', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('asks before connecting Claude Desktop, then shows a restart notice per assistant after connecting', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const data = url === '/api/assistants'
        ? LIST
        : url.endsWith('claude-desktop/connect') && !body.confirm
          ? { needsConfirm: true, configPath: '/cfg.json', backupPath: '/cfg.bak' }
          : { ok: true, status: 'connected' };
      return { ok: true, json: async () => data };
    }));
    render(<LanguageContext.Provider value="en"><AssistantSection /></LanguageContext.Provider>);

    await screen.findAllByText('Connect');
    for (const [name, notice] of NOTICES) {
      const group = screen.getByRole('group', { name });
      expect(screen.queryByText(notice)).toBeNull();
      fireEvent.click(within(group).getByText('Connect'));
      if (name === 'Claude Desktop') {
        expect(await screen.findByText("You'll need to quit Claude Desktop completely (Cmd+Q) and reopen it.")).toBeTruthy();
        fireEvent.click(screen.getByText('Yes, connect'));
      }
      expect(await screen.findByText(notice)).toBeTruthy();
    }
  });
});
