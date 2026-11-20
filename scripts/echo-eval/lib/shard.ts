import type { Shard } from '../types/shard';

export function parseShard(index: string | null, count: string | null): Shard | null {
  const i = Number(index);
  const n = Number(count);
  if (index === null || count === null || !Number.isInteger(i) || !Number.isInteger(n)) return null;
  return n >= 2 && i >= 0 && i < n ? { index: i, count: n } : null;
}

export const shardItems = <T>(items: T[], shard: Shard | null): T[] =>
  shard ? items.filter((_, i) => i % shard.count === shard.index) : items;

export const shardQuery = (shard: Shard | null): string => (shard ? `&shard=${shard.index}&shards=${shard.count}` : '');

export const shardSuffix = (shard: Shard | null): string => (shard ? `.shard${shard.index}` : '');

export const allShards = (count: number): Shard[] => Array.from({ length: count }, (_, index) => ({ index, count }));
