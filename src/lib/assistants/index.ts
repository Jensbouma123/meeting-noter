import { appInfo } from './app-assistant';
import { connectCli, cliInfo, disconnectCli } from './cli-assistant';
import { connectDesktop, desktopInfo, disconnectDesktop } from './desktop';
import { desktopBundlePaths } from './desktop-config';
import type { AssistantDeps, AssistantId, AssistantInfo, ConnectResult } from './types';

function isInstalled(info: AssistantInfo, deps: AssistantDeps): boolean {
  if (info.id === 'claude-desktop') {
    return desktopBundlePaths(deps.env).some((bundle) => deps.fileExists(bundle));
  }
  return info.status !== 'not-found';
}

export async function listAssistants(deps: AssistantDeps): Promise<AssistantInfo[]> {
  const items: AssistantInfo[] = [
    desktopInfo(deps),
    await cliInfo('claude-code', deps),
    appInfo('codex-app', deps),
    await cliInfo('codex', deps),
    appInfo('gemini-app', deps),
    await cliInfo('agy', deps),
  ];
  return items.map((info) => ({ ...info, installed: isInstalled(info, deps) }));
}

export async function connectAssistant(id: AssistantId, deps: AssistantDeps, confirm = false): Promise<ConnectResult> {
  if (id === 'claude-desktop') return connectDesktop(deps, confirm);
  if (id === 'codex-app' || id === 'gemini-app') return { ok: false, error: 'not-supported' };
  return connectCli(id, deps);
}

export async function disconnectAssistant(id: AssistantId, deps: AssistantDeps): Promise<ConnectResult> {
  if (id === 'claude-desktop') return disconnectDesktop(deps);
  if (id === 'codex-app' || id === 'gemini-app') return { ok: false, error: 'not-supported' };
  return disconnectCli(id, deps);
}
