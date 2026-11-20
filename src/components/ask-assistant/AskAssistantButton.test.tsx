// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import type { Segment } from '@/lib/meeting';
import { resetConfiguredAssistants } from '@/lib/ask-assistant/configuredAssistantsStore';
import { AskAssistantButton } from './AskAssistantButton';

const SEGMENTS: Segment[] = [
  { id: 's1', source: 'mic', speaker: 'a', text: 'We pakken de begroting op.', start: 0, end: 2, final: true },
];
const SPEAKERS = { a: { id: 'a', source: 'mic' as const, label: 'Anna', colorIndex: 0 } };

function visibleText(node: Node): string {
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return '';
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  return [...node.childNodes].map(visibleText).join('');
}

afterEach(() => {
  cleanup();
  resetConfiguredAssistants();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubAssistants(connected: string[]) {
  const assistants = ['claude-desktop', 'claude-code', 'codex'].map((id) => ({
    id,
    status: connected.includes(id) ? 'connected' : 'not-connected',
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ assistants }))),
  );
}

function renderButton(onOpenSettings = vi.fn()) {
  render(
    <LanguageContext.Provider value="nl">
      <ToastProvider>
        <AskAssistantButton
          title="Weekoverleg"
          startedAt={null}
          segments={SEGMENTS}
          speakers={SPEAKERS}
          onOpenSettings={onOpenSettings}
        />
      </ToastProvider>
    </LanguageContext.Provider>,
  );
  return onOpenSettings;
}

const name = (item: HTMLElement) => [...item.childNodes].reduce((text, node) => text + visibleText(node), '').trim();

describe('AskAssistantButton', () => {
  it('lists described presets and only the connected assistants, and asks Claude Desktop for action items', async () => {
    stubAssistants(['claude-desktop', 'codex']);
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderButton();

    expect(await screen.findByRole('button', { name: 'Vraag Claude Desktop' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Meer manieren om te vragen' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(items.map(name)).toEqual([
      'SamenvattenKorte samenvatting van wat er besproken is',
      'BesluitenAlle genomen besluiten op een rij',
      'ActiepuntenTaken met eigenaar en deadline',
      'Alle drieSamenvatting, besluiten en actiepunten in een keer',
      'Transcript opschonenLeesbaar transcript zonder ehs en herhalingen',
      'Eigen vraagStel zelf een vraag over deze meeting',
      'Claude Desktop',
      'Codex',
    ]);
    expect(items[6]).toHaveAttribute('aria-current', 'true');

    await act(async () => fireEvent.click(items[2]));
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('claude://claude.ai/new?q='),
      '_blank',
      'noopener,noreferrer',
    );
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain('actiepunten');
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Anna: We pakken de begroting op.')),
    );
  });

  it('copies without opening a URL for a command-line assistant', async () => {
    stubAssistants(['codex']);
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderButton();

    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'Vraag Codex' })));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(open).not.toHaveBeenCalled();
  });

  it('leads to Settings when no assistant is connected', async () => {
    stubAssistants([]);
    const onOpenSettings = renderButton();

    fireEvent.click(await screen.findByRole('button', { name: 'Meer manieren om te vragen' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(name(items[items.length - 1])).toBe('Assistent koppelenKies er een in Instellingen, onder AI-assistent');
    fireEvent.click(items[items.length - 1]);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Vraag een assistent' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(2);
  });
});
