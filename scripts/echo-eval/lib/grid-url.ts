export const MAX_GRID_SHARDS = 16;

export const SHARD_PROGRESS_MESSAGE = 'echo-eval-shard-progress';

const FRAME_OWNED = ['shard', 'shards', 'autostart'];

export function parseGridShards(value: string | null): number | null {
  const n = Number(value);
  return value !== null && Number.isInteger(n) && n >= 2 && n <= MAX_GRID_SHARDS ? n : null;
}

export function shardFrameUrls(params: URLSearchParams, shards: number): string[] {
  return Array.from({ length: shards }, (_, i) => {
    const q = new URLSearchParams(params);
    for (const key of FRAME_OWNED) q.delete(key);
    q.set('autostart', '1');
    q.set('shard', String(i));
    q.set('shards', String(shards));
    return `/dev/echo-eval?${q.toString()}`;
  });
}

export const gridUrl = (base: string, query: string, shards: number): string =>
  `${base}/dev/echo-eval/grid?shards=${shards}${query}`;

export function gridShape(n: number): { cols: number; rows: number } {
  const cols = Math.ceil(Math.sqrt(n));
  return { cols, rows: Math.ceil(n / cols) };
}
