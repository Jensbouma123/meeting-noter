import { spawn } from 'node:child_process';
import path from 'node:path';
import { mcpScriptPath } from './mcp-entry';

export function buildMcpBundle(env: NodeJS.ProcessEnv): Promise<boolean> {
  const root = process.cwd();
  const cli = path.join(root, 'node_modules', 'rolldown', 'bin', 'cli.mjs');
  const out = mcpScriptPath(env);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, '-c', path.join('scripts', 'mcp', 'rolldown.config.mjs')], {
      cwd: root,
      env: { ...process.env, MCP_OUT: out },
      stdio: 'ignore',
    });
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });
}
