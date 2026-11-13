import { MCP_SERVER_NAME, mcpEntry } from './mcp-entry';
import type { CliAssistant } from './types';

export const CLI_BIN: Record<CliAssistant, string> = { 'claude-code': 'claude', codex: 'codex' };

export function addArgs(id: CliAssistant, env: NodeJS.ProcessEnv): string[] {
  const { command, args } = mcpEntry(env);
  const scope = id === 'claude-code' ? ['--scope', 'user'] : [];
  return ['mcp', 'add', ...scope, MCP_SERVER_NAME, '--', command, ...args];
}

export function removeArgs(id: CliAssistant): string[] {
  const scope = id === 'claude-code' ? ['--scope', 'user'] : [];
  return ['mcp', 'remove', MCP_SERVER_NAME, ...scope];
}

export function manualCommand(id: CliAssistant, env: NodeJS.ProcessEnv): string {
  const quoted = addArgs(id, env).map((a) => (/^[\w./:=@-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`));
  return [CLI_BIN[id], ...quoted].join(' ');
}
