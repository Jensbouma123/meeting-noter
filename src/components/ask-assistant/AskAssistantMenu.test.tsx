// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfiguredAssistants } from '@/lib/ask-assistant/configuredAssistantsStore';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { installViewport, setViewport, VIEWPORTS } from '@/test/viewport';
import { name, openMenu, renderButton } from './AskAssistantButton.test-support';
import { AskAssistantMenu } from './AskAssistantMenu';

let restoreViewport: () => void;

beforeEach(() => {
  restoreViewport = installViewport(VIEWPORTS.desktop);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ assistants: [] }))),
  );
});

afterEach(() => {
  cleanup();
  resetConfiguredAssistants();
  localStorage.clear();
  restoreViewport();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function openAskMenu(overrides: Partial<Parameters<typeof AskAssistantMenu>[0]> = {}) {
  const props: Parameters<typeof AskAssistantMenu>[0] = {
    assistant: { id: 'claude-desktop', name: 'Claude Desktop' },
    configuredIds: ['claude-desktop', 'claude-code', 'codex', 'gemini-app'],
    loaded: true,
    hasTranscript: true,
    onPreset: vi.fn(),
    onCustom: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
  render(
    <LanguageContext.Provider value="en">
      <AskAssistantMenu {...props} />
    </LanguageContext.Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ask assistant...' }));
  return props;
}

describe('AskAssistantMenu', () => {
  it('renders a 2-column panel on wide viewports with Assistant left and Ask for right', () => {
    openAskMenu();
    const menu = screen.getByRole('menu', { hidden: true });
    expect(menu).toHaveClass('mic-menu', 'max-w-[calc(100vw-2rem)]');
    expect(menu.querySelector('[data-layout="two-column"]')).not.toBeNull();
    expect(menu.querySelector('[data-layout="stacked"]')).toBeNull();

    const left = menu.querySelector<HTMLElement>('[data-column="assistant"]');
    const right = menu.querySelector<HTMLElement>('[data-column="prompts"]');
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();

    expect(within(left!).getByText('Assistant')).toBeInTheDocument();
    const radios = within(left!).getAllByRole('menuitemradio', { hidden: true });
    expect(radios.map((r) => r.textContent)).toEqual([
      'Claude DesktopApp',
      'Claude CodeCLI',
      'Codex CLICLI',
      'GeminiApp',
    ]);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');

    expect(within(right!).getByText('Ask for')).toBeInTheDocument();
    const prompts = within(right!).getAllByRole('menuitem', { hidden: true });
    expect(prompts).toHaveLength(6);
    expect(prompts[0]).toHaveTextContent('Summarise');
    expect(prompts[0]).toHaveTextContent('A short summary of what was discussed');
  });

  it('falls back to a stacked single column on narrow viewports and responds to resize', () => {
    setViewport(VIEWPORTS.phone);
    openAskMenu();
    const menu = screen.getByRole('menu', { hidden: true });
    expect(menu.querySelector('[data-layout="stacked"]')).not.toBeNull();
    expect(menu.querySelector('[data-layout="two-column"]')).toBeNull();
    expect(within(menu).getByRole('separator', { hidden: true })).toBeInTheDocument();

    act(() => setViewport(VIEWPORTS.desktop));
    expect(menu.querySelector('[data-layout="two-column"]')).not.toBeNull();
    expect(menu.querySelector('[data-layout="stacked"]')).toBeNull();
  });

  it('shows a Settings link when no assistants are installed', () => {
    const props = openAskMenu({ assistant: null, configuredIds: [] });
    const left = screen.getByRole('menu', { hidden: true }).querySelector<HTMLElement>('[data-column="assistant"]');
    const settingsRow = within(left!).getByRole('menuitem', { hidden: true });
    expect(settingsRow).toHaveTextContent('Connect an assistant');
    fireEvent.click(settingsRow);
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('falls back to the first installed assistant when the saved choice is no longer installed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              assistants: [
                { id: 'claude-desktop', status: 'not-found', installed: false },
                { id: 'claude-code', status: 'not-connected', installed: true },
                { id: 'gemini-app', status: 'installed', installed: true },
              ],
            }),
          ),
      ),
    );
    localStorage.setItem('meeting-noter.ask-assistant', 'claude-desktop');
    renderButton();
    const trigger = await openMenu();
    await waitFor(() => expect(trigger.querySelector('[data-testid="assistant-logo-claude-code"]')).not.toBeNull());
    const options = screen.getAllByRole('menuitemradio', { hidden: true });
    expect(options.map(name)).toEqual(['Claude CodeCLI', 'GeminiApp']);
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
  });
});
