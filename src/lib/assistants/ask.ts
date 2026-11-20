import { execFile } from 'node:child_process';
import { APP_NAME } from './app-assistant';
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
  };
}

export async function launchAsk(id: AssistantId, prompt: string, deps: AskLaunchDeps): Promise<AskLaunchResult> {
  if (isCliAssistant(id)) return launchInTerminal(id, prompt, deps);
  if (id === 'codex-app') {
    return (await deps.open(['-a', APP_NAME[id]]))
      ? { ok: true, prefilled: false }
      : { ok: false, error: 'open-failed' };
  }
  return { ok: false, error: 'not-supported' };
}
