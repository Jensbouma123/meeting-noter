export type AssistantId = 'claude-desktop' | 'claude-code' | 'codex-app' | 'codex' | 'gemini-app' | 'agy';
export type CliAssistant = 'claude-code' | 'codex' | 'agy';
export type AppAssistant = 'codex-app' | 'gemini-app';
export type AssistantVendor = 'anthropic' | 'openai' | 'google';
export type AssistantKind = 'app' | 'cli';
export type DesktopConfig = Record<string, unknown> & {
  mcpServers?: Record<string, unknown>;
};
export type AssistantStatus = 'connected' | 'installed' | 'needs-repair' | 'not-connected' | 'not-found';

export interface AssistantCatalogEntry {
  vendor: AssistantVendor;
  kind: AssistantKind;
}

export interface AssistantInfo {
  id: AssistantId;
  status: AssistantStatus;
  installed?: boolean;
  canAutoConnect: boolean;
  manualCommand: string | null;
  configPath: string | null;
}

export type CliMcpServers = Record<string, { disabled?: unknown } | undefined>;

export interface CliJsonConfig {
  mcpServers?: CliMcpServers;
  projects?: Record<string, { mcpServers?: CliMcpServers } | undefined>;
}

export type CliRunner = (bin: string, args: string[]) => Promise<{ ok: boolean; stdout: string }>;

export interface AssistantDeps {
  env: NodeJS.ProcessEnv;
  now: () => Date;
  findCli: (name: string) => string | null;
  runCli: CliRunner;
  fileExists: (file: string) => boolean;
  buildMcp: (env: NodeJS.ProcessEnv) => Promise<boolean>;
}

export type ConnectResult =
  | { needsConfirm: true; configPath: string; backupPath: string }
  | { ok: true; status: AssistantStatus }
  | { ok: false; error: string; manualCommand?: string | null };

export interface McpLocation {
  cwd?: string;
  exists?: (file: string) => boolean;
}
