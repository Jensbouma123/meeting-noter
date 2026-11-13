import path from 'node:path';

export const MCP_SERVER_NAME = 'meeting-noter';

export function mcpScriptPath(env: NodeJS.ProcessEnv): string {
  return env.MEETING_NOTER_MCP_PATH ?? path.join(process.cwd(), 'build', 'mcp', 'meetings-mcp.mjs');
}

export function mcpEntry(env: NodeJS.ProcessEnv): { command: string; args: string[] } {
  return { command: 'node', args: [mcpScriptPath(env)] };
}
