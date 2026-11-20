export interface AskLaunchDeps {
  env: NodeJS.ProcessEnv;
  findCli: (name: string) => string | null;
  open: (args: string[]) => Promise<boolean>;
}

export type AskLaunchResult = { ok: true; prefilled: boolean } | { ok: false; error: string };

export interface RunScriptInput {
  bin: string;
  flag: readonly string[];
  promptPath: string;
  dir: string;
}
