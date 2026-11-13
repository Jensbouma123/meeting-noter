import { connectCli, cliInfo, disconnectCli } from './cli-assistant';
import { connectDesktop, desktopInfo, disconnectDesktop } from './desktop';
import type { AssistantDeps, AssistantId, AssistantInfo, ConnectResult } from './types';

export async function listAssistants(deps: AssistantDeps): Promise<AssistantInfo[]> {
  return [desktopInfo(deps), await cliInfo('claude-code', deps), await cliInfo('codex', deps)];
}

export async function connectAssistant(id: AssistantId, deps: AssistantDeps, confirm = false): Promise<ConnectResult> {
  return id === 'claude-desktop' ? connectDesktop(deps, confirm) : connectCli(id, deps);
}

export async function disconnectAssistant(id: AssistantId, deps: AssistantDeps): Promise<ConnectResult> {
  return id === 'claude-desktop' ? disconnectDesktop(deps) : disconnectCli(id, deps);
}
