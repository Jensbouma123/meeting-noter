import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_PORT, LEGACY_PORT } from '@/lib/lifecycle/constants';
import { DONE_MARKER, PENDING_MARKER } from './constants';
import { startLegacyListener } from './legacy-listener';
import type { LegacyBridge, LegacyListenOptions } from './types';

const KEY = Symbol.for('meeting-noter.legacy-origin');

export function legacyBridge(): LegacyBridge {
  const g = globalThis as unknown as Record<symbol, LegacyBridge | undefined>;
  g[KEY] ??= { state: 'none', root: null, close: null };
  return g[KEY];
}

export function migrationPending(root: string): boolean {
  return existsSync(path.join(root, PENDING_MARKER)) && !existsSync(path.join(root, DONE_MARKER));
}

export async function startLegacyBridge(
  root: string | null,
  serverPort: number,
  version: string,
  listen: Partial<LegacyListenOptions> = {},
): Promise<LegacyBridge> {
  const bridge = legacyBridge();
  if (!root || bridge.state !== 'none') return bridge;
  bridge.root = root;
  if (!migrationPending(root)) {
    bridge.state = existsSync(path.join(root, DONE_MARKER)) ? 'done' : 'none';
    return bridge;
  }
  if (serverPort !== (listen.appPort ?? APP_PORT)) return bridge;
  bridge.state = 'busy';
  const onExpire = () => {
    if (bridge.state !== 'listening') return;
    bridge.close = null;
    bridge.state = 'expired';
  };
  const close = await startLegacyListener({ port: LEGACY_PORT, appPort: serverPort, version, onExpire, ...listen });
  if (bridge.state !== 'busy') {
    close?.();
    return bridge;
  }
  if (close) {
    bridge.close = close;
    bridge.state = 'listening';
  }
  return bridge;
}

export function completeLegacyBridge(): LegacyBridge {
  const bridge = legacyBridge();
  if (!bridge.root) return bridge;
  writeFileSync(path.join(bridge.root, DONE_MARKER), `${new Date().toISOString()}\n`);
  rmSync(path.join(bridge.root, PENDING_MARKER), { force: true });
  bridge.close?.();
  bridge.close = null;
  bridge.state = 'done';
  return bridge;
}
