// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { AskAssistantPicker } from './AskAssistantPicker';

describe('AskAssistantPicker', () => {
  it('groups assistants by company in catalog order with an App/CLI tag', () => {
    render(
      <LanguageContext.Provider value="en">
        <AskAssistantPicker
          assistantId="codex"
          configuredIds={['agy', 'codex', 'claude-desktop', 'gemini-app', 'claude-code']}
          onOpenSettings={() => {}}
        />
      </LanguageContext.Provider>,
    );
    const groups = within(screen.getByRole('group', { name: 'Assistant' })).getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Anthropic', 'OpenAI', 'Google']);
    const rows = (g: HTMLElement) =>
      within(g)
        .getAllByRole('menuitemradio')
        .map((r) => r.textContent);
    expect(rows(groups[0])).toEqual(['Claude DesktopApp', 'Claude CodeCLI']);
    expect(rows(groups[1])).toEqual(['Codex CLICLI']);
    expect(rows(groups[2])).toEqual(['GeminiApp', 'Antigravity CLICLI']);
    expect(within(groups[1]).getByRole('menuitemradio')).toHaveAttribute('aria-checked', 'true');
  });
});
