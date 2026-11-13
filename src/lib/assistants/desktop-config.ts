import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MCP_SERVER_NAME, mcpEntry } from './mcp-entry';
import type { DesktopConfig as Config } from './types';

export function desktopConfigPath(env: NodeJS.ProcessEnv): string {
  return (
    env.MEETING_NOTER_CLAUDE_DESKTOP_CONFIG ??
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  );
}

export function desktopBackupPath(file: string, now: Date): string {
  return `${file}.backup-${now.toISOString().replace(/[:.]/g, '-')}`;
}

export function readDesktopConfig(file: string): Config | null {
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Config) : null;
  } catch {
    return null;
  }
}

export function mergeEntry(config: Config, env: NodeJS.ProcessEnv): Config {
  return { ...config, mcpServers: { ...config.mcpServers, [MCP_SERVER_NAME]: mcpEntry(env) } };
}

export function removeEntry(config: Config): Config {
  const servers = { ...config.mcpServers };
  delete servers[MCP_SERVER_NAME];
  return { ...config, mcpServers: servers };
}

export function hasEntry(config: Config | null): boolean {
  return !!config?.mcpServers && MCP_SERVER_NAME in config.mcpServers;
}

export function writeDesktopConfig(file: string, config: Config, backupPath: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, backupPath);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
