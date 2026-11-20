// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import type { Segment } from '@/lib/meeting';
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
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AskAssistantButton', () => {
  it('lists presets, own question and assistants, and asks Claude for action items', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <LanguageContext.Provider value="nl">
        <ToastProvider>
          <AskAssistantButton title="Weekoverleg" startedAt={null} segments={SEGMENTS} speakers={SPEAKERS} />
        </ToastProvider>
      </LanguageContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Meer manieren om te vragen' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    const name = (item: HTMLElement) =>
      [...item.childNodes].reduce((text, node) => text + visibleText(node), '').trim();
    expect(items.map(name)).toEqual([
      'Samenvatten',
      'Besluiten',
      'Actiepunten',
      'Alle drie',
      'Transcript opschonen',
      'Eigen vraag…',
      'Claude',
      'ChatGPT',
      'Gemini',
      'Copilot',
      'Perplexity',
      'Le Chat',
    ]);
    expect(items[6]).toHaveAttribute('aria-current', 'true');

    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Actiepunten', hidden: true })));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://claude.ai/new?q='), '_blank', 'noopener,noreferrer');
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain('actiepunten');
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Anna: We pakken de begroting op.')));
  });
});
