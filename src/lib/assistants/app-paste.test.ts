import { describe, expect, it } from 'vitest';
import { PASTE_SCRIPT } from './app-paste';
import { launchAsk } from './ask';
import type { AskLaunchDeps, OsascriptResult } from './ask.types';

const NASTY = `"; do shell script "rm -rf ~" --\n${'x'.repeat(7000)}`;

const fresh = () => ({ opened: [] as string[][], copied: [] as string[], scripts: [] as string[][] });

function deps(calls: ReturnType<typeof fresh>, paste: OsascriptResult = { ok: true, stderr: '' }, openOk = true, copyOk = true): AskLaunchDeps {
  return {
    env: { NODE_ENV: 'test' },
    findCli: () => null,
    open: async (args) => {
      calls.opened.push(args);
      return openOk;
    },
    copy: async (text) => {
      calls.copied.push(text);
      return copyOk;
    },
    osascript: async (args) => {
      calls.scripts.push(args);
      return paste;
    },
  };
}

describe('launchAsk (apps)', () => {
  it.each([
    ['codex-app', 'Codex'],
    ['gemini-app', 'Gemini'],
  ] as const)('%s opens the app and pastes from the clipboard with a constant script', async (id, name) => {
    const calls = fresh();
    expect(await launchAsk(id, NASTY, deps(calls))).toEqual({ ok: true, prefilled: true });
    expect(calls.copied).toEqual([NASTY]);
    expect(calls.opened).toEqual([['-a', name]]);
    expect(calls.scripts).toEqual([['-e', PASTE_SCRIPT, name]]);
    expect(PASTE_SCRIPT).not.toContain('rm -rf');
    expect(PASTE_SCRIPT).not.toMatch(/key code 36|keystroke return/);
  });

  it('prefills a short prompt in Claude Desktop through its deep link without pasting', async () => {
    const calls = fresh();
    expect(await launchAsk('claude-desktop', 'a & b?', deps(calls))).toEqual({ ok: true, prefilled: true });
    expect(calls.opened).toEqual([['claude://claude.ai/new?q=a%20%26%20b%3F']]);
    expect(calls.scripts).toEqual([]);
  });

  it('opens a new Claude chat and pastes once the encoded prompt no longer fits the link', async () => {
    const calls = fresh();
    expect(await launchAsk('claude-desktop', `a${' '.repeat(2000)}`, deps(calls))).toEqual({ ok: true, prefilled: true });
    expect(calls.opened).toEqual([['claude://claude.ai/new']]);
    expect(calls.scripts).toEqual([['-e', PASTE_SCRIPT, 'Claude']]);
  });

  it.each([
    'execution error: System Events got an error: osascript is not allowed to send keystrokes. (1002)',
    'Not authorized to send Apple events to System Events. (-1743)',
    'System Events got an error: (-1719)',
  ])('reports missing Accessibility access with the prompt left on the clipboard: %s', async (stderr) => {
    const calls = fresh();
    expect(await launchAsk('gemini-app', 'hi', deps(calls, { ok: false, stderr }))).toEqual({
      ok: true,
      prefilled: false,
      reason: 'accessibility',
    });
  });

  it('keeps the app open with the clipboard filled when the paste fails for another reason', async () => {
    const calls = fresh();
    expect(await launchAsk('codex-app', 'hi', deps(calls, { ok: false, stderr: 'app-not-ready' }))).toEqual({
      ok: true,
      prefilled: false,
    });
  });

  it('fails without pasting when the app cannot open, the clipboard fails or the prompt is empty', async () => {
    const calls = fresh();
    expect(await launchAsk('codex-app', 'hi', deps(calls, undefined, false))).toEqual({ ok: false, error: 'open-failed' });
    expect(await launchAsk('gemini-app', 'hi', deps(calls, undefined, true, false))).toEqual({
      ok: false,
      error: 'copy-failed',
    });
    expect(await launchAsk('claude-desktop', ' ', deps(calls))).toEqual({ ok: false, error: 'empty-prompt' });
    expect(calls.scripts).toEqual([]);
  });
});
