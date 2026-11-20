import { CLI_BIN, addArgs, manualCommand, removeArgs } from './cli-commands';
import { readCliRegistration } from './cli-config';
import { MCP_SERVER_NAME, ensureMcpBundle, mcpScriptPath } from './mcp-entry';
import type { AssistantDeps, CliAssistant, AssistantInfo, AssistantStatus, ConnectResult } from './types';

async function listedByCli(bin: string, deps: AssistantDeps): Promise<boolean> {
  const { ok, stdout } = await deps.runCli(bin, ['mcp', 'list']);
  return (
    ok &&
    stdout
      .split('\n')
      .some((l) => l.trim().startsWith(`${MCP_SERVER_NAME}:`) || l.trim().startsWith(`${MCP_SERVER_NAME} `))
  );
}

// `mcp list` health-checks every server (seconds), so the config file is the source of truth.
async function statusOf(id: CliAssistant, bin: string, deps: AssistantDeps): Promise<AssistantStatus> {
  const listed = readCliRegistration(id, deps.env) ?? (await listedByCli(bin, deps));
  if (!listed) return 'not-connected';
  return deps.fileExists(mcpScriptPath(deps.env, { exists: deps.fileExists })) ? 'connected' : 'needs-repair';
}

export async function cliInfo(id: CliAssistant, deps: AssistantDeps): Promise<AssistantInfo> {
  const bin = deps.findCli(CLI_BIN[id]);
  const manual = manualCommand(id, deps.env);
  if (!bin) return { id, status: 'not-found', canAutoConnect: false, manualCommand: manual, configPath: null };
  return { id, status: await statusOf(id, bin, deps), canAutoConnect: true, manualCommand: manual, configPath: null };
}

export async function connectCli(id: CliAssistant, deps: AssistantDeps): Promise<ConnectResult> {
  const bin = deps.findCli(CLI_BIN[id]);
  const manual = manualCommand(id, deps.env);
  if (!bin) return { ok: false, error: 'cli-not-found', manualCommand: manual };
  if (!(await ensureMcpBundle(deps))) return { ok: false, error: 'mcp-build-failed', manualCommand: manual };
  await deps.runCli(bin, removeArgs(id));
  const res = await deps.runCli(bin, addArgs(id, deps.env));
  return res.ok ? { ok: true, status: 'connected' } : { ok: false, error: 'cli-failed', manualCommand: manual };
}

export async function disconnectCli(id: CliAssistant, deps: AssistantDeps): Promise<ConnectResult> {
  const bin = deps.findCli(CLI_BIN[id]);
  if (!bin) return { ok: false, error: 'cli-not-found' };
  const res = await deps.runCli(bin, removeArgs(id));
  return res.ok ? { ok: true, status: 'not-connected' } : { ok: false, error: 'cli-failed' };
}
