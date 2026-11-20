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

export function filePointerPrompt(file: string): string {
  return `Read the file ${file} and follow the instructions at its top.`;
}

export function buildRunScript({ bin, flag, promptPath, cwd, remove }: RunScriptInput): string {
  return [
    '#!/bin/sh',
    `cd ${shellQuote(cwd)} || exit 1`,
    `prompt="$(cat ${shellQuote(promptPath)})"`,
    `rm -rf ${remove.map(shellQuote).join(' ')}`,
    `exec ${[bin, ...flag].map(shellQuote).join(' ')} "$prompt"`,
    '',
  ].join('\n');
}
