import fs from 'node:fs/promises';
import path from 'node:path';
import { meetingsDataDir } from '@/lib/meeting-db/paths';
import { CLI_BIN } from './cli-commands';
import { CLI_PROMPT_FLAG, buildRunScript, filePointerPrompt, promptFileText } from './terminal-script';
import type { CliAssistant } from './types';
import type { AskLaunchDeps, AskLaunchResult } from './ask.types';

export const MAX_INLINE_PROMPT_BYTES = 100_000;
const STALE_MS = 24 * 60 * 60 * 1000;

async function purgeStale(root: string, now: number): Promise<void> {
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const { mtimeMs } = await fs.stat(dir);
    if (now - mtimeMs > STALE_MS) await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function launchInTerminal(
  id: CliAssistant,
  prompt: string,
  deps: AskLaunchDeps,
): Promise<AskLaunchResult> {
  if (!prompt.trim()) return { ok: false, error: 'empty-prompt' };
  const bin = deps.findCli(CLI_BIN[id]);
  if (!bin) return { ok: false, error: 'cli-not-found' };
  const root = path.join(meetingsDataDir(deps.env), 'ask');
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  await purgeStale(root, Date.now());
  const dir = await fs.mkdtemp(path.join(root, `${id}-`));
  await fs.chmod(dir, 0o700);
  const promptPath = path.join(dir, 'prompt.txt');
  const scriptPath = path.join(dir, 'run.command');
  const inline = Buffer.byteLength(prompt, 'utf8') <= MAX_INLINE_PROMPT_BYTES;
  let text = promptFileText(prompt);
  if (!inline) {
    const transcriptPath = path.join(dir, 'transcript.md');
    await fs.writeFile(transcriptPath, prompt, { mode: 0o600 });
    text = filePointerPrompt(transcriptPath);
  }
  await fs.writeFile(promptPath, text, { mode: 0o600 });
  const remove = inline ? [dir] : [promptPath, scriptPath];
  const script = buildRunScript({ bin, flag: CLI_PROMPT_FLAG[id], promptPath, cwd: root, remove });
  await fs.writeFile(scriptPath, script, { mode: 0o700 });
  await fs.chmod(scriptPath, 0o755);
  if (await deps.open(['-a', 'Terminal', scriptPath])) return { ok: true, prefilled: true };
  await fs.rm(dir, { recursive: true, force: true });
  return { ok: false, error: 'open-failed' };
}
