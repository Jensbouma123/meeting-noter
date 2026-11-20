import fs from "node:fs/promises";
import path from "node:path";
import { meetingsDataDir } from "@/lib/meeting-db/paths";
import { CLI_BIN } from "./cli-commands";
import {
  CLI_PROMPT_FLAG,
  buildRunScript,
  promptFileText,
} from "./terminal-script";
import type { CliAssistant } from "./types";
import type { AskLaunchDeps, AskLaunchResult } from "./ask.types";

/** Stays well under macOS ARG_MAX, since the prompt becomes one argv entry. */
export const MAX_TERMINAL_PROMPT_CHARS = 400_000;

export async function launchInTerminal(
  id: CliAssistant,
  prompt: string,
  deps: AskLaunchDeps,
): Promise<AskLaunchResult> {
  if (!prompt.trim()) return { ok: false, error: "empty-prompt" };
  if (prompt.length > MAX_TERMINAL_PROMPT_CHARS)
    return { ok: false, error: "prompt-too-large" };
  const bin = deps.findCli(CLI_BIN[id]);
  if (!bin) return { ok: false, error: "cli-not-found" };
  const root = path.join(meetingsDataDir(deps.env), "ask");
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const dir = await fs.mkdtemp(path.join(root, `${id}-`));
  await fs.chmod(dir, 0o700);
  const promptPath = path.join(dir, "prompt.txt");
  const scriptPath = path.join(dir, "run.command");
  await fs.writeFile(promptPath, promptFileText(prompt), { mode: 0o600 });
  await fs.writeFile(
    scriptPath,
    buildRunScript({ bin, flag: CLI_PROMPT_FLAG[id], promptPath, dir }),
    { mode: 0o700 },
  );
  await fs.chmod(scriptPath, 0o755);
  if (await deps.open(["-a", "Terminal", scriptPath]))
    return { ok: true, prefilled: true };
  await fs.rm(dir, { recursive: true, force: true });
  return { ok: false, error: "open-failed" };
}
