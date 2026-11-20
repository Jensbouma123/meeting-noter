import { MAX_PREFILL_ENCODED_CHARS } from '@/lib/ask-assistant/resolveAskTarget';
import { PASTE_APP_NAME } from './app-assistant';
import type { AskLaunchDeps, AskLaunchResult, PasteApp } from './ask.types';

const CLAUDE_NEW_CHAT = 'claude://claude.ai/new';

export const PASTE_SCRIPT = [
  'on run argv',
  '  set appName to item 1 of argv',
  '  tell application appName to activate',
  '  set isReady to false',
  '  repeat 40 times',
  '    tell application "System Events"',
  '      set frontProc to first application process whose frontmost is true',
  '      if name of frontProc is appName and (count of windows of frontProc) > 0 then set isReady to true',
  '    end tell',
  '    if isReady then exit repeat',
  '    delay 0.2',
  '  end repeat',
  '  if not isReady then error "app-not-ready"',
  '  delay 0.8',
  '  tell application "System Events" to keystroke "v" using command down',
  'end run',
].join('\n');

const ACCESSIBILITY_DENIED = /-1719|-1743|\b1002\b|not allowed/i;

function openArgs(id: PasteApp, encoded: string | null): string[] {
  if (id !== 'claude-desktop') return ['-a', PASTE_APP_NAME[id]];
  return [encoded === null ? CLAUDE_NEW_CHAT : `${CLAUDE_NEW_CHAT}?q=${encoded}`];
}

export async function launchPasteApp(id: PasteApp, prompt: string, deps: AskLaunchDeps): Promise<AskLaunchResult> {
  if (!prompt.trim()) return { ok: false, error: 'empty-prompt' };
  const encoded = encodeURIComponent(prompt);
  const deepLink = id === 'claude-desktop' && encoded.length <= MAX_PREFILL_ENCODED_CHARS ? encoded : null;
  const copied = await deps.copy(prompt);
  if (!copied && deepLink === null) return { ok: false, error: 'copy-failed' };
  if (!(await deps.open(openArgs(id, deepLink)))) return { ok: false, error: 'open-failed' };
  if (deepLink !== null) return { ok: true, prefilled: true };
  const pasted = await deps.osascript(['-e', PASTE_SCRIPT, PASTE_APP_NAME[id]]);
  if (pasted.ok) return { ok: true, prefilled: true };
  if (ACCESSIBILITY_DENIED.test(pasted.stderr)) return { ok: true, prefilled: false, reason: 'accessibility' };
  return { ok: true, prefilled: false };
}
