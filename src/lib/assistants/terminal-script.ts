import type { CliAssistant } from "./types";
import type { RunScriptInput } from "./ask.types";

/** Flags that start each CLI interactively with its first message, verified against each `--help`. */
export const CLI_PROMPT_FLAG: Readonly<
  Record<CliAssistant, readonly string[]>
> = {
  "claude-code": [],
  codex: [],
  agy: ["--prompt-interactive"],
};

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** A leading dash would make the CLI parse the prompt as an option. */
export function promptFileText(prompt: string): string {
  return prompt.startsWith("-") ? ` ${prompt}` : prompt;
}

/**
 * The script only holds paths this app generated, each single-quoted. The prompt itself
 * stays in its file and reaches the CLI through a quoted variable, never as shell source.
 */
export function buildRunScript({
  bin,
  flag,
  promptPath,
  dir,
}: RunScriptInput): string {
  return [
    "#!/bin/sh",
    `prompt="$(cat ${shellQuote(promptPath)})"`,
    `rm -rf ${shellQuote(dir)}`,
    `exec ${[bin, ...flag].map(shellQuote).join(" ")} "$prompt"`,
    "",
  ].join("\n");
}
