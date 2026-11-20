// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cellSources, gridShape, gridUrl, isWarmPhase, parseGridShards, shardFrameUrls } from './grid-url';

describe('shardFrameUrls', () => {
  it('builds one autostarting URL per shard and passes the other params through', () => {
    const urls = shardFrameUrls(new URLSearchParams('shards=3&set=meetings&limit=5&fake=1'), 3);
    expect(urls).toHaveLength(3);
    urls.forEach((url, i) => {
      const [path, qs] = url.split('?');
      const q = new URLSearchParams(qs);
      expect(path).toBe('/dev/echo-eval');
      expect(Object.fromEntries(q)).toEqual({
        set: 'meetings',
        limit: '5',
        fake: '1',
        autostart: '1',
        shard: String(i),
        shards: '3',
      });
    });
  });

  it('overrides stray shard and autostart params from the grid URL', () => {
    const [url] = shardFrameUrls(new URLSearchParams('shard=7&autostart=0&shards=2'), 2);
    expect(new URLSearchParams(url.split('?')[1]).getAll('shard')).toEqual(['0']);
    expect(new URLSearchParams(url.split('?')[1]).getAll('autostart')).toEqual(['1']);
  });
});

describe('gridUrl', () => {
  it('appends the run query after the shard count', () => {
    expect(gridUrl('http://localhost:3000', '&limit=2&set=meetings', 4)).toBe(
      'http://localhost:3000/dev/echo-eval/grid?shards=4&limit=2&set=meetings',
    );
  });
});

describe('parseGridShards', () => {
  it('accepts 2..16 and rejects missing, single, fractional or oversized counts', () => {
    expect(parseGridShards('4')).toBe(4);
    expect(parseGridShards('16')).toBe(16);
    expect(parseGridShards(null)).toBeNull();
    expect(parseGridShards('1')).toBeNull();
    expect(parseGridShards('2.5')).toBeNull();
    expect(parseGridShards('17')).toBeNull();
  });
});

describe('gridShape', () => {
  it('keeps the grid as square as possible', () => {
    expect(gridShape(4)).toEqual({ cols: 2, rows: 2 });
    expect(gridShape(6)).toEqual({ cols: 3, rows: 2 });
    expect(gridShape(2)).toEqual({ cols: 2, rows: 1 });
  });
});

describe('cellSources', () => {
  const urls = ['/a', '/b', '/c'];

  it('starts only the warm shard while the model cache is cold', () => {
    expect(cellSources(urls, false)).toEqual(['/a', null, null]);
  });

  it('starts every shard once the warm shard has loaded the models', () => {
    expect(cellSources(urls, true)).toEqual(urls);
  });
});

describe('isWarmPhase', () => {
  it('is warm once the frame is past loading, including a failed load', () => {
    expect(['idle', 'loading'].map(isWarmPhase)).toEqual([false, false]);
    expect(['running', 'done', 'error'].map(isWarmPhase)).toEqual([true, true, true]);
  });
});
