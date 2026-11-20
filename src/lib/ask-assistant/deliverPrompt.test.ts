import { describe, expect, it, vi } from 'vitest';
import { ASK_ASSISTANTS } from './assistants';
import { deliverPrompt } from './deliverPrompt';
import type { AskDeliveryIo } from './types';

function io(launchOk = true): AskDeliveryIo & Record<string, ReturnType<typeof vi.fn>> {
  return {
    copy: vi.fn(async () => true),
    launchApp: vi.fn(),
    openWeb: vi.fn(),
    requestLaunch: vi.fn(async () => launchOk),
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
    const x = io(false);
    expect(await deliverPrompt(ASK_ASSISTANTS['claude-code'], 'P', x)).toBe('copied');
    expect(x.copy).toHaveBeenCalledWith('P');
  });

  it('copies before opening Gemini and the Codex app', async () => {
    const g = io();
    expect(await deliverPrompt(ASK_ASSISTANTS['gemini-app'], 'P', g)).toBe('copied');
    expect(g.launchApp).toHaveBeenCalledWith('googlegemini://', 'https://gemini.google.com/app');
    const c = io(false);
    expect(await deliverPrompt(ASK_ASSISTANTS['codex-app'], 'P', c)).toBe('copied');
    expect(c.requestLaunch).toHaveBeenCalledWith('codex-app', '');
    expect(c.openWeb).toHaveBeenCalledWith('https://chatgpt.com/codex');
  });
});
