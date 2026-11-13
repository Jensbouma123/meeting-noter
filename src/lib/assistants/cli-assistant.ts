import { CLI_BIN, addArgs, manualCommand, removeArgs } from './cli-commands';
import { MCP_SERVER_NAME } from './mcp-entry';
import type { AssistantDeps, CliAssistant, AssistantInfo, AssistantStatus, ConnectResult } from './types';

async function statusOf(bin: string, deps: AssistantDeps): Promise<AssistantStatus> {
  const { ok, stdout } = await deps.runCli(bin, ['mcp', 'list']);
  return ok && stdout.split('\n').some((l) => l.trim().startsWith(`${MCP_SERVER_NAME}:`) || l.trim().startsWith(`${MCP_SERVER_NAME} `))
    ? 'connected'
    : 'not-connected';
}

export async function cliInfo(id: CliAssistant, deps: AssistantDeps): Promise<AssistantInfo> {
  const bin = deps.findCli(CLI_BIN[id]);
  const manual = manualCommand(id, deps.env);
  if (!bin) return { id, status: 'not-found', canAutoConnect: false, manualCommand: manual, configPath: null };
  return { id, status: await statusOf(bin, deps), canAutoConnect: true, manualCommand: manual, configPath: null };
}

export async function connectCli(id: CliAssistant, deps: AssistantDeps): Promise<ConnectResult> {
  const bin = deps.findCli(CLI_BIN[id]);
  const manual = manualCommand(id, deps.env);
  if (!bin) return { ok: false, error: 'cli-not-found', manualCommand: manual };
  const res = await deps.runCli(bin, addArgs(id, deps.env));
  return res.ok ? { ok: true, status: 'connected' } : { ok: false, error: 'cli-failed', manualCommand: manual };
}

export async function disconnectCli(id: CliAssistant, deps: AssistantDeps): Promise<ConnectResult> {
  const bin = deps.findCli(CLI_BIN[id]);
  if (!bin) return { ok: false, error: 'cli-not-found' };
  const res = await deps.runCli(bin, removeArgs(id));
  return res.ok ? { ok: true, status: 'not-connected' } : { ok: false, error: 'cli-failed' };
}
