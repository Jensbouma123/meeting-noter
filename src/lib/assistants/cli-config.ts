import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MCP_SERVER_NAME } from './mcp-entry';
import type { CliAssistant, CliJsonConfig, CliMcpServers } from './types';

export function cliConfigPath(id: CliAssistant, env: NodeJS.ProcessEnv): string {
  const home = env.HOME || os.homedir();
  if (id === 'claude-code') return path.join(env.CLAUDE_CONFIG_DIR || home, '.claude.json');
  if (id === 'codex') return path.join(env.CODEX_HOME || path.join(home, '.codex'), 'config.toml');
  return path.join(home, '.gemini', 'config', 'mcp_config.json');
}

function hasServer(servers: CliMcpServers | undefined): boolean {
  const entry = servers?.[MCP_SERVER_NAME];
  return !!entry && entry.disabled !== true;
}

const TOML_HEADER = new RegExp(
  `^\\s*\\[\\s*mcp_servers\\s*\\.\\s*(?:"${MCP_SERVER_NAME}"|'${MCP_SERVER_NAME}'|${MCP_SERVER_NAME})\\s*\\]`,
  'm',
);

function registeredIn(id: CliAssistant, text: string, cwd: string): boolean {
  if (id === 'codex') return TOML_HEADER.test(text);
  const config = JSON.parse(text) as CliJsonConfig;
  if (id === 'agy') return hasServer(config.mcpServers);
  return hasServer(config.mcpServers) || hasServer(config.projects?.[cwd]?.mcpServers);
}

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
