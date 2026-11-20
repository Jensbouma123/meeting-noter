import type { CliAssistant } from './types';
import type { RunScriptInput } from './ask.types';

export const CLI_PROMPT_FLAG: Readonly<Record<CliAssistant, readonly string[]>> = {
  'claude-code': [],
  codex: [],
  agy: ['--prompt-interactive'],
};

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function promptFileText(prompt: string): string {
  return prompt.startsWith('-') ? ` ${prompt}` : prompt;
}

export function buildRunScript({ bin, flag, promptPath, dir }: RunScriptInput): string {
  return [
    '#!/bin/sh',
    `prompt="$(cat ${shellQuote(promptPath)})"`,
    `rm -rf ${shellQuote(dir)}`,
    `exec ${[bin, ...flag].map(shellQuote).join(' ')} "$prompt"`,
    '',
  ].join('\n');
}
