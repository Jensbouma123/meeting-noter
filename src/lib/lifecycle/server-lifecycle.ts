import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { detectInstall } from '../update/detect-install';
import { IdleTracker } from './idle-shutdown';
import type { Lifecycle } from './types';
import { updateRunning } from '../update/update-files';

const KEY = Symbol.for('meeting-noter.lifecycle');

export function lifecycle(): Lifecycle {
  const g = globalThis as unknown as Record<symbol, Lifecycle | undefined>;
  g[KEY] ??= {
    tracker: new IdleTracker(),
    idleShutdown: process.env.MEETING_NOTER_IDLE_SHUTDOWN === '1',
    install: detectInstall(),
    timer: null,
  };
  return g[KEY];
}

export function startIdleShutdown(intervalMs = 5_000): void {
  const lc = lifecycle();
  if (!lc.idleShutdown || lc.timer) return;
  lc.timer = setInterval(() => {
    if (!lc.tracker.shouldShutdown({ busy: updateRunning(lc.install.stateDir) })) return;
    console.log('[meeting-noter] no window open any more; stopping the server');
    if (lc.install.root) {
      const pidFile = path.join(lc.install.root, 'server.pid');
      try {
        if (readFileSync(pidFile, 'utf8').trim() === String(process.pid)) rmSync(pidFile, { force: true });
      } catch {}
    }
    process.exit(0);
  }, intervalMs);
  lc.timer.unref();
}
