import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MCP_SERVER_NAME } from './mcp-entry';
import type { CliAssistant } from './types';

// File locations and shapes as written by `<cli> mcp add` (claude 2.x, codex, agy).
export function cliConfigPath(id: CliAssistant, env: NodeJS.ProcessEnv): string {
  const home = env.HOME || os.homedir();
  if (id === 'claude-code') return path.join(env.CLAUDE_CONFIG_DIR || home, '.claude.json');
  if (id === 'codex') return path.join(env.CODEX_HOME || path.join(home, '.codex'), 'config.toml');
  return path.join(home, '.gemini', 'config', 'mcp_config.json');
}

type Servers = Record<string, { disabled?: unknown } | undefined>;
type JsonConfig = { mcpServers?: Servers; projects?: Record<string, { mcpServers?: Servers } | undefined> };

function hasServer(servers: Servers | undefined): boolean {
  const entry = servers?.[MCP_SERVER_NAME];
  return !!entry && entry.disabled !== true;
}

const TOML_HEADER = new RegExp(`^\\s*\\[\\s*mcp_servers\\s*\\.\\s*(?:"${MCP_SERVER_NAME}"|'${MCP_SERVER_NAME}'|${MCP_SERVER_NAME})\\s*\\]`, 'm');

function registeredIn(id: CliAssistant, text: string, cwd: string): boolean {
  if (id === 'codex') return TOML_HEADER.test(text);
  const config = JSON.parse(text) as JsonConfig;
  if (id === 'agy') return hasServer(config.mcpServers);
  return hasServer(config.mcpServers) || hasServer(config.projects?.[cwd]?.mcpServers);
}

// true/false when the config file answers it (a missing file means not registered), null when it cannot be read.
export function readCliRegistration(
  id: CliAssistant,
  env: NodeJS.ProcessEnv,
  cwd: string = process.cwd(),
): boolean | null {
  let text: string;
  try {
    text = fs.readFileSync(cliConfigPath(id, env), 'utf8');
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'ENOENT' ? false : null;
  }
  try {
    return registeredIn(id, text, cwd);
  } catch {
    return null;
  }
}
