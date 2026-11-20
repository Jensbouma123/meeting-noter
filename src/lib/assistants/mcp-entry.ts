import { isPackagedApp, mcpNodeCommand, mcpScriptPath } from './mcp-paths';
import type { AssistantDeps, McpLocation } from './types';

export { mcpScriptPath } from './mcp-paths';

export const MCP_SERVER_NAME = 'meeting-noter';

export function mcpEntry(env: NodeJS.ProcessEnv, location: McpLocation = {}): { command: string; args: string[] } {
  return { command: mcpNodeCommand(location), args: [mcpScriptPath(env, location)] };
}

export async function ensureMcpBundle(
  deps: Pick<AssistantDeps, 'env' | 'fileExists' | 'buildMcp'>,
  cwd: string = process.cwd(),
): Promise<boolean> {
  const location = { cwd, exists: deps.fileExists };
  if (deps.fileExists(mcpScriptPath(deps.env, location))) return true;
  if (isPackagedApp(location)) return false;
  return (await deps.buildMcp(deps.env)) && deps.fileExists(mcpScriptPath(deps.env, location));
}
