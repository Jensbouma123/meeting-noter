import { execFile } from 'node:child_process';
import { launchPasteApp } from './app-paste';
import { findCli } from './cli';
import { isCliAssistant } from './catalog';
import { launchInTerminal } from './terminal-launch';
import type { AssistantId } from './types';
import type { AskLaunchDeps, AskLaunchResult } from './ask.types';

export function defaultAskDeps(env: NodeJS.ProcessEnv = process.env): AskLaunchDeps {
  return {
    env,
    findCli: (name) => findCli(name, env),
    open: (args) =>
      new Promise((resolve) => {
        execFile('open', args, { timeout: 10_000 }, (err) => resolve(!err));
      }),
    copy: (text) =>
      new Promise((resolve) => {
        const child = execFile('pbcopy', { timeout: 10_000, env: { ...env, LANG: 'en_US.UTF-8' } }, (err) =>
          resolve(!err),
        );
        child.stdin?.end(text, 'utf8');
      }),
    osascript: (args) =>
      new Promise((resolve) => {
        execFile('osascript', args, { timeout: 20_000 }, (err, _stdout, stderr) =>
          resolve({ ok: !err, stderr: String(stderr ?? '') }),
        );
      }),
  };
}

export async function launchAsk(id: AssistantId, prompt: string, deps: AskLaunchDeps): Promise<AskLaunchResult> {
  if (isCliAssistant(id)) return launchInTerminal(id, prompt, deps);
  return launchPasteApp(id, prompt, deps);
}
