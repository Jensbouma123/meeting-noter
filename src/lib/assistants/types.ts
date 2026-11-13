export type AssistantId = 'claude-desktop' | 'claude-code' | 'codex';
export type CliAssistant = Exclude<AssistantId, 'claude-desktop'>;
export type DesktopConfig = Record<string, unknown> & { mcpServers?: Record<string, unknown> };
export type AssistantStatus = 'connected' | 'not-connected' | 'not-found';

export interface AssistantInfo {
  id: AssistantId;
  status: AssistantStatus;
  canAutoConnect: boolean;
  manualCommand: string | null;
  configPath: string | null;
}

export type CliRunner = (bin: string, args: string[]) => Promise<{ ok: boolean; stdout: string }>;

export interface AssistantDeps {
  env: NodeJS.ProcessEnv;
  now: () => Date;
  findCli: (name: string) => string | null;
  runCli: CliRunner;
}

export type ConnectResult =
  | { needsConfirm: true; configPath: string; backupPath: string }
  | { ok: true; status: AssistantStatus }
  | { ok: false; error: string; manualCommand?: string | null };
