import { describe, expect, it, vi } from 'vitest';
import { ASK_ASSISTANTS } from './assistants';
import { deliverPrompt } from './deliverPrompt';
import type { AskDeliveryIo, AskLaunchResponse } from './types';

function io(result: AskLaunchResponse = { ok: true, prefilled: true }): AskDeliveryIo & Record<string, ReturnType<typeof vi.fn>> {
  return {
    copy: vi.fn(async () => true),
    launchApp: vi.fn(),
    openWeb: vi.fn(),
    requestLaunch: vi.fn(async () => result),
  };
}

describe('deliverPrompt', () => {
  it('opens CLIs prefilled in Terminal without the clipboard', async () => {
    const x = io();
    expect(await deliverPrompt(ASK_ASSISTANTS.agy, 'P', x)).toBe('opened');
    expect(x.requestLaunch).toHaveBeenCalledWith('agy', 'P');
    expect(x.copy).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard when Terminal cannot open', async () => {
    const x = io({ ok: false });
    expect(await deliverPrompt(ASK_ASSISTANTS['claude-code'], 'P', x)).toBe('copied');
    expect(x.copy).toHaveBeenCalledWith('P');
  });

  it.each(['claude-desktop', 'codex-app', 'gemini-app'] as const)(
    'sends the real prompt to the server for %s and reports it opened when pasted',
    async (id) => {
      const x = io();
      expect(await deliverPrompt(ASK_ASSISTANTS[id], 'P', x)).toBe('opened');
      expect(x.requestLaunch).toHaveBeenCalledWith(id, 'P');
      expect(x.launchApp).not.toHaveBeenCalled();
      expect(x.openWeb).not.toHaveBeenCalled();
    },
  );

  it('tells the user to grant Accessibility when the server could not paste', async () => {
    const x = io({ ok: true, prefilled: false, reason: 'accessibility' });
    expect(await deliverPrompt(ASK_ASSISTANTS['gemini-app'], 'P', x)).toBe('accessibility');
    expect(x.copy).toHaveBeenCalledWith('P');
    expect(await deliverPrompt(ASK_ASSISTANTS['codex-app'], 'P', io({ ok: true, prefilled: false }))).toBe('copied');
  });

  it('falls back to the web with the prompt on the clipboard when the server cannot open the app', async () => {
    const c = io({ ok: false });
    expect(await deliverPrompt(ASK_ASSISTANTS['codex-app'], 'P', c)).toBe('copied');
    expect(c.openWeb).toHaveBeenCalledWith('https://chatgpt.com/codex');
    const claude = io({ ok: false });
    expect(await deliverPrompt(ASK_ASSISTANTS['claude-desktop'], 'a b', claude)).toBe('opened');
    expect(claude.openWeb).toHaveBeenCalledWith('https://claude.ai/new?q=a%20b');
  });
});
