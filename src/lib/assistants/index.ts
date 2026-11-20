import { appInfo } from "./app-assistant";
import { connectCli, cliInfo, disconnectCli } from "./cli-assistant";
import { connectDesktop, desktopInfo, disconnectDesktop } from "./desktop";
import type {
  AssistantDeps,
  AssistantId,
  AssistantInfo,
  ConnectResult,
} from "./types";

export async function listAssistants(
  deps: AssistantDeps,
): Promise<AssistantInfo[]> {
  return [
    desktopInfo(deps),
    await cliInfo("claude-code", deps),
    appInfo("codex-app", deps),
    await cliInfo("codex", deps),
    appInfo("gemini-app", deps),
    await cliInfo("agy", deps),
  ];
}

export async function connectAssistant(
  id: AssistantId,
  deps: AssistantDeps,
  confirm = false,
): Promise<ConnectResult> {
  if (id === "claude-desktop") return connectDesktop(deps, confirm);
  if (id === "codex-app" || id === "gemini-app")
    return { ok: false, error: "not-supported" };
  return connectCli(id, deps);
}

export async function disconnectAssistant(
  id: AssistantId,
  deps: AssistantDeps,
): Promise<ConnectResult> {
  if (id === "claude-desktop") return disconnectDesktop(deps);
  if (id === "codex-app" || id === "gemini-app")
    return { ok: false, error: "not-supported" };
  return disconnectCli(id, deps);
}
