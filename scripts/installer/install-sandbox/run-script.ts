import { spawnSync } from 'node:child_process';
import { sandbox } from './sandbox';

export function runScript(script: string, env: Record<string, string> = {}, args: string[] = []) {
  const r = spawnSync('/bin/bash', [script, ...args], {
    env: {
      NODE_ENV: 'test',
      PATH: `${sandbox.shims}:/usr/bin:/bin:/usr/sbin:/sbin`,
      HOME: sandbox.home,
      MEETING_NOTER_DOWNLOAD_BASE: `file://${sandbox.base}`,
      MEETING_NOTER_NO_LAUNCHD: '1',
      MEETING_NOTER_NO_OPEN: '1',
      MEETING_NOTER_SKIP_GPU_MODEL: '1',
      ...env,
    },
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout + r.stderr };
}
