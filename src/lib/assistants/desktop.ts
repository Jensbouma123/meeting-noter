import fs from 'node:fs';
import path from 'node:path';
import {
  desktopBackupPath, desktopConfigPath, hasEntry, mergeEntry, readDesktopConfig, removeEntry, writeDesktopConfig,
} from './desktop-config';
import { ensureMcpBundle, mcpScriptPath } from './mcp-entry';
import type { AssistantDeps, AssistantInfo, AssistantStatus, ConnectResult } from './types';

function statusOf(file: string, deps: AssistantDeps): AssistantStatus {
  if (!fs.existsSync(path.dirname(file))) return 'not-found';
  if (!hasEntry(readDesktopConfig(file))) return 'not-connected';
  return deps.fileExists(mcpScriptPath(deps.env)) ? 'connected' : 'needs-repair';
}

export function desktopInfo(deps: AssistantDeps): AssistantInfo {
  const file = desktopConfigPath(deps.env);
  const status = statusOf(file, deps);
  return { id: 'claude-desktop', status, canAutoConnect: status !== 'not-found', manualCommand: null, configPath: file };
}

export async function connectDesktop(deps: AssistantDeps, confirm: boolean): Promise<ConnectResult> {
  const file = desktopConfigPath(deps.env);
  if (statusOf(file, deps) === 'not-found') return { ok: false, error: 'not-found' };
  const config = readDesktopConfig(file);
  if (!config) return { ok: false, error: 'config-unreadable' };
  const backupPath = desktopBackupPath(file, deps.now());
  if (!confirm) return { needsConfirm: true, configPath: file, backupPath };
  if (!(await ensureMcpBundle(deps))) return { ok: false, error: 'mcp-build-failed' };
  try {
    writeDesktopConfig(file, mergeEntry(config, deps.env), backupPath);
  } catch {
    return { ok: false, error: 'write-failed' };
  }
  return { ok: true, status: 'connected' };
}

export function disconnectDesktop(deps: AssistantDeps): ConnectResult {
  const file = desktopConfigPath(deps.env);
  const config = readDesktopConfig(file);
  if (!config) return { ok: false, error: 'config-unreadable' };
  if (!hasEntry(config)) return { ok: true, status: 'not-connected' };
  try {
    writeDesktopConfig(file, removeEntry(config), desktopBackupPath(file, deps.now()));
  } catch {
    return { ok: false, error: 'write-failed' };
  }
  return { ok: true, status: 'not-connected' };
}
