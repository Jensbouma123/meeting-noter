// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { mergeShardResults } from './shard-merge';
import { allShards, parseShard, shardItems, shardQuery, shardSuffix } from './shard';

describe('parseShard', () => {
  it('accepts a valid split and rejects missing, single-tab or out-of-range values', () => {
    expect(parseShard('2', '4')).toEqual({ index: 2, count: 4 });
    expect(parseShard(null, null)).toBeNull();
    expect(parseShard('0', null)).toBeNull();
    expect(parseShard('0', '1')).toBeNull();
    expect(parseShard('4', '4')).toBeNull();
    expect(parseShard('-1', '4')).toBeNull();
    expect(parseShard('1.5', '4')).toBeNull();
  });
});

describe('shardItems', () => {
  const items = Array.from({ length: 10 }, (_, i) => `m${i}`);

  it('gives tab i the items whose index % n === i', () => {
    expect(shardItems(items, { index: 1, count: 4 })).toEqual(['m1', 'm5', 'm9']);
  });

  it('splits the plan into disjoint shards that cover every item', () => {
    const parts = allShards(4).map((s) => shardItems(items, s));
    expect(parts.flat().sort()).toEqual([...items].sort());
    expect(new Set(parts.flat()).size).toBe(items.length);
  });

  it('returns the whole plan without a shard', () => {
    expect(shardItems(items, null)).toBe(items);
    expect(shardQuery(null)).toBe('');
    expect(shardSuffix(null)).toBe('');
    expect(shardQuery({ index: 3, count: 4 })).toBe('&shard=3&shards=4');
  });
});

describe('mergeShardResults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shard-merge-'));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (name: string, ids: string[], tag: string) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, ids.map((id) => `${JSON.stringify({ id, tag })}\n`).join(''));
    return file;
  };
  const read = (file: string) =>
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as { id: string; tag: string });

  it('combines shard files, keeps earlier target rows and lets a shard row win on the same id', () => {
    const target = write('meetings.jsonl', ['old', 'm1'], 'target');
    const s0 = write('meetings.shard0.jsonl', ['m0', 'm2', 'm2'], 's0');
    const s1 = write('meetings.shard1.jsonl', ['m1', 'm3'], 's1');
    expect(mergeShardResults(target, [s0, s1, path.join(dir, 'missing.jsonl')])).toBe(5);
    expect(read(target)).toEqual([
      { id: 'old', tag: 'target' },
      { id: 'm1', tag: 's1' },
      { id: 'm0', tag: 's0' },
      { id: 'm2', tag: 's0' },
      { id: 'm3', tag: 's1' },
    ]);
  });

  it('creates the target when it does not exist yet', () => {
    const target = path.join(dir, 'fresh.jsonl');
    const s0 = write('fresh.shard0.jsonl', ['a'], 's0');
    expect(mergeShardResults(target, [s0])).toBe(1);
    expect(read(target)).toEqual([{ id: 'a', tag: 's0' }]);
  });
});
