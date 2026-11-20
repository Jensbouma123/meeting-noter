import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { launchAsk } from './ask';
import { buildRunScript, shellQuote } from './terminal-script';
import type { AskLaunchDeps } from './ask.types';

const NASTY = `it's $(rm -rf ~) \`whoami\` "q"\nline2 $HOME`;

function deps(opened: string[][], ok = true): AskLaunchDeps {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ask-launch-'));
  return {
    env: { NODE_ENV: 'test', MEETING_NOTER_DATA_DIR: dir },
    findCli: (name) => `/opt/bin dir/${name}`,
    open: async (args) => {
      opened.push(args);
      return ok;
    },
  };
}

describe('buildRunScript', () => {
  it('single-quotes every generated path and passes the prompt only via a variable', () => {
    const script = buildRunScript({
      bin: "/b/it's/agy",
      flag: ['--prompt-interactive'],
      promptPath: '/d/p.txt',
      dir: '/d',
    });
    expect(script).toContain(`exec ${shellQuote("/b/it's/agy")} '--prompt-interactive' "$prompt"`);
    expect(script).toContain(`prompt="$(cat '/d/p.txt')"`);
  });
});

describe('launchAsk (cli)', () => {
  it.each([
    ['claude-code', `exec '/opt/bin dir/claude' "$prompt"`],
    ['codex', `exec '/opt/bin dir/codex' "$prompt"`],
    ['agy', `exec '/opt/bin dir/agy' '--prompt-interactive' "$prompt"`],
  ] as const)('%s keeps the prompt in the file, never in the script', async (id, execLine) => {
    const opened: string[][] = [];
    const result = await launchAsk(id, NASTY, deps(opened));
    expect(result).toEqual({ ok: true, prefilled: true });
    expect(opened).toHaveLength(1);
    const [flag, app, scriptPath] = opened[0];
    expect([flag, app]).toEqual(['-a', 'Terminal']);
    const script = fs.readFileSync(scriptPath, 'utf8');
    expect(script).toContain(execLine);
    for (const piece of ['rm -rf ~', 'whoami', "it's", 'line2']) expect(script).not.toContain(piece);
    expect(fs.readFileSync(path.join(path.dirname(scriptPath), 'prompt.txt'), 'utf8')).toBe(NASTY);
    expect(fs.statSync(path.dirname(scriptPath)).mode & 0o777).toBe(0o700);
    expect(fs.statSync(scriptPath).mode & 0o777).toBe(0o755);
  });

  it('prefixes a leading dash so the CLI cannot read the prompt as an option', async () => {
    const opened: string[][] = [];
    await launchAsk('codex', '--help me', deps(opened));
    expect(fs.readFileSync(path.join(path.dirname(opened[0][2]), 'prompt.txt'), 'utf8')).toBe(' --help me');
  });

  it('refuses an empty prompt and cleans up when Terminal does not open', async () => {
    const opened: string[][] = [];
    expect(await launchAsk('agy', '  ', deps(opened))).toEqual({
      ok: false,
      error: 'empty-prompt',
    });
    const failing = deps(opened, false);
    expect(await launchAsk('agy', 'hi', failing)).toEqual({
      ok: false,
      error: 'open-failed',
    });
    expect(fs.existsSync(path.dirname(opened[0][2]))).toBe(false);
  });
});

describe('launchAsk (apps)', () => {
  it('opens the Codex app without the prompt and refuses others', async () => {
    const opened: string[][] = [];
    expect(await launchAsk('codex-app', 'x', deps(opened))).toEqual({
      ok: true,
      prefilled: false,
    });
    expect(opened).toEqual([['-a', 'Codex']]);
    expect(await launchAsk('gemini-app', 'x', deps(opened))).toEqual({
      ok: false,
      error: 'not-supported',
    });
  });
});
