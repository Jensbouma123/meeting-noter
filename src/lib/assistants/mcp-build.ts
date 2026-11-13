import { spawn } from 'node:child_process';
import path from 'node:path';
import { devScriptPath } from './mcp-paths';

export function buildMcpBundle(env: NodeJS.ProcessEnv): Promise<boolean> {
  const root = process.cwd();
  const cli = path.join(root, 'node_modules', 'rolldown', 'bin', 'cli.mjs');
  const out = env.MEETING_NOTER_MCP_PATH ?? devScriptPath(root);
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
