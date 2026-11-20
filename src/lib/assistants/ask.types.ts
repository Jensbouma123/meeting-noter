import type { AssistantId, CliAssistant } from './types';

export type PasteApp = Exclude<AssistantId, CliAssistant>;

export interface OsascriptResult {
  ok: boolean;
  stderr: string;
}

export interface AskLaunchDeps {
  env: NodeJS.ProcessEnv;
  findCli: (name: string) => string | null;
  open: (args: string[]) => Promise<boolean>;
  copy: (text: string) => Promise<boolean>;
  osascript: (args: string[]) => Promise<OsascriptResult>;
}

export type AskLaunchResult =
  | { ok: true; prefilled: boolean; reason?: 'accessibility' }
  | { ok: false; error: string };

export interface RunScriptInput {
  bin: string;
  flag: readonly string[];
  promptPath: string;
  cwd: string;
  remove: readonly string[];
}
