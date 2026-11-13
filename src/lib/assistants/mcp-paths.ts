import fs from 'node:fs';
import path from 'node:path';
import type { McpLocation } from './types';

export function packagedScriptPath(cwd: string): string {
  return path.join(cwd, '..', 'mcp', 'meetings-mcp.mjs');
}

export function devScriptPath(cwd: string): string {
  return path.join(cwd, 'build', 'mcp', 'meetings-mcp.mjs');
}

export function bundledNodePath(cwd: string): string {
  return path.join(cwd, '..', 'node', 'bin', 'node');
}

export function isPackagedApp({ cwd = process.cwd(), exists = fs.existsSync }: McpLocation = {}): boolean {
  return exists(bundledNodePath(cwd));
}

export function mcpScriptPath(env: NodeJS.ProcessEnv, { cwd = process.cwd(), exists = fs.existsSync }: McpLocation = {}): string {
  if (env.MEETING_NOTER_MCP_PATH) return env.MEETING_NOTER_MCP_PATH;
  const packaged = packagedScriptPath(cwd);
  const dev = devScriptPath(cwd);
  if (exists(packaged)) return packaged;
  if (exists(dev)) return dev;
  return isPackagedApp({ cwd, exists }) ? packaged : dev;
}

export function mcpNodeCommand({ cwd = process.cwd(), exists = fs.existsSync }: McpLocation = {}): string {
  const bundled = bundledNodePath(cwd);
  return exists(bundled) ? path.resolve(bundled) : 'node';
}
