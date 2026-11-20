// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { resetConfiguredAssistants } from '@/lib/ask-assistant/configuredAssistantsStore';
import { launchAppLink } from '@/lib/ask-assistant/launchAppLink';
import {
  name,
  openMenu,
  renderButton,
  stubAssistants,
  stubClipboard,
  visibleText,
} from './AskAssistantButton.test-support';

vi.mock('@/lib/ask-assistant/launchAppLink', () => ({
  APP_LAUNCH_WAIT_MS: 1500,
  launchAppLink: vi.fn(),
}));

afterEach(() => {
  cleanup();
  resetConfiguredAssistants();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(launchAppLink).mockReset();
});

describe('AskAssistantButton', () => {
  it('shows one "Vraag assistent..." button with only the saved assistant logo', async () => {
    stubAssistants(['claude-desktop', 'codex']);
    localStorage.setItem('meeting-noter.ask-assistant', 'codex');
    renderButton();
    const trigger = await screen.findByRole('button', {
      name: 'Vraag assistent...',
    });
    await waitFor(() => expect(trigger.querySelector('[data-testid="assistant-logo-codex"]')).not.toBeNull());
    expect(visibleText(trigger).trim()).toBe('Vraag assistent...');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('switches assistant inside the menu, keeps it open and saves the choice', async () => {
    stubAssistants(['claude-desktop', 'codex']);
    renderButton();
    const trigger = await openMenu();
    const options = await screen.findAllByRole('menuitemradio', {
      hidden: true,
    });
    expect(options.map(name)).toEqual(['Claude Desktop', 'Codex']);
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(options[1]);
    expect(localStorage.getItem('meeting-noter.ask-assistant')).toBe('codex');
    expect(screen.getAllByRole('menuitemradio', { hidden: true })[1]).toHaveAttribute('aria-checked', 'true');
    expect(trigger.querySelector('[data-testid="assistant-logo-codex"]')).not.toBeNull();
    expect(screen.getAllByRole('menuitem', { hidden: true }).map(name)).toEqual([
      'SamenvattenKorte samenvatting van wat er besproken is',
      'BesluitenAlle genomen besluiten op een rij',
      'ActiepuntenTaken met eigenaar en deadline',
      'Alle drieSamenvatting, besluiten en actiepunten in een keer',
      'Transcript opschonenLeesbaar transcript zonder ehs en herhalingen',
      'Eigen vraagStel zelf een vraag over deze meeting',
    ]);
  });

  it('opens the Claude app with the prompt and transcript in the link, without touching the clipboard', async () => {
    stubAssistants(['claude-desktop']);
    const writeText = stubClipboard();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderButton();
    await openMenu();
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    await act(async () => fireEvent.click(items[2]));
    const [appUrl, webUrl] = vi.mocked(launchAppLink).mock.calls[0];
    expect(appUrl).toMatch(/^claude:\/\/claude\.ai\/new\?q=/);
    expect(decodeURIComponent(appUrl)).toContain('actiepunten');
    expect(decodeURIComponent(appUrl)).toContain('Anna: We pakken de begroting op.');
    expect(webUrl).toMatch(/^https:\/\/claude\.ai\/new\?q=/);
    expect(open).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(await screen.findByText('Geopend in Claude Desktop')).toBeInTheDocument();
  });

  it('copies the full prompt and says where to paste it when no link can carry the text', async () => {
    stubAssistants(['codex']);
    const writeText = stubClipboard();
    renderButton();
    await openMenu();
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    await act(async () => fireEvent.click(items[0]));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toContain('Vat deze meeting samen');
    expect(prompt).toContain('Anna: We pakken de begroting op.');
    expect(launchAppLink).not.toHaveBeenCalled();
    expect(await screen.findByText('Prompt gekopieerd, plak hem in Codex')).toBeInTheDocument();
  });

  it('leads to Settings when no assistant is connected', async () => {
    stubAssistants([]);
    const onOpenSettings = renderButton();
    await openMenu();
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(name(items[0])).toBe('Assistent koppelenGa naar Instellingen, AI-assistent');
    fireEvent.click(items[0]);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
