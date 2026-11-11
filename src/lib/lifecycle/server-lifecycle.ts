/**
 * The one IdleTracker of this server process, and the timer that stops the
 * server when it says so. Kept on globalThis: Next bundles each route
 * separately, so module state alone would not be shared between them.
 *
 * Idle shutdown is on only when launcher.sh started the server
 * (MEETING_NOTER_IDLE_SHUTDOWN=1); `next dev` and Start Meeting Noter.command
 * keep running until stopped by hand.
 */
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { detectInstall, updateRunning, type InstallInfo } from '../update/server-update';
import { IdleTracker } from './idle-shutdown';

type Lifecycle = { tracker: IdleTracker; idleShutdown: boolean; install: InstallInfo; timer: NodeJS.Timeout | null };

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
    // launcher.sh wrote our pid; drop it so nothing mistakes a reused pid for us.
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
