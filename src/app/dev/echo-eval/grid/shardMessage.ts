import { SHARD_PROGRESS_MESSAGE, isWarmPhase } from '../../../../../scripts/echo-eval/lib/grid-url';
import type { ShardMessage } from './types';

export const WARM_FALLBACK_MS = 90_000;
export const SHARD_HEARTBEAT_MS = 2_000;

export function shardMessage(shard: number, text: string, phase: string): ShardMessage {
  return { type: SHARD_PROGRESS_MESSAGE, shard, text, phase, ready: isWarmPhase(phase) };
}

export function parseShardMessage(data: unknown): ShardMessage | null {
  if (typeof data !== 'object' || data === null) return null;
  const m = data as Partial<ShardMessage>;
  if (m.type !== SHARD_PROGRESS_MESSAGE || !Number.isInteger(m.shard)) return null;
  const phase = typeof m.phase === 'string' ? m.phase : '';
  const text = typeof m.text === 'string' ? m.text : phase;
  return { type: SHARD_PROGRESS_MESSAGE, shard: m.shard as number, text, phase, ready: m.ready === true || isWarmPhase(phase) };
}

export function isTrustedSource(e: MessageEvent, win: Window): boolean {
  if (e.origin === win.location.origin) return true;
  return Array.from({ length: win.frames.length }, (_, i) => win.frames[i]).includes(e.source as Window);
}
