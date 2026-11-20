import { expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import type { Segment } from '@/lib/meeting';
import { AskAssistantButton } from './AskAssistantButton';

const MEETING_TITLE = 'Weekoverleg';
const SEGMENTS: Segment[] = [
  {
    id: 's1',
    source: 'mic',
    speaker: 'a',
    text: 'We pakken de begroting op.',
    start: 0,
    end: 2,
    final: true,
  },
];
const SPEAKERS = {
  a: { id: 'a', source: 'mic' as const, label: 'Anna', colorIndex: 0 },
};

export function visibleText(node: Node): string {
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return '';
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  return [...node.childNodes].map(visibleText).join('');
}

export function stubAssistants(connected: string[]) {
  const assistants = ['claude-desktop', 'claude-code', 'codex'].map((id) => ({
    id,
    status: connected.includes(id) ? 'connected' : 'not-connected',
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ assistants }))),
  );
}

export function renderButton(onOpenSettings = vi.fn()) {
  render(
    <LanguageContext.Provider value="nl">
      <ToastProvider>
        <AskAssistantButton
          title={MEETING_TITLE}
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

export const name = (item: HTMLElement) =>
  [...item.childNodes].reduce((text, node) => text + visibleText(node), '').trim();

export function stubClipboard() {
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  return writeText;
}

export async function openMenu() {
  const trigger = await screen.findByRole('button', {
    name: 'Vraag assistent...',
  });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.click(trigger);
  return trigger;
}
