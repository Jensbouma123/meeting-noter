import { describe, expect, it } from 'vitest';
import { computeFolderSuggestions } from './compute';
import { folderCentroids, suggestFolder } from './suggest';

const v = (...n: number[]) => new Float32Array(n);
const windows = (x: number, y: number) => [v(x, y), v(x, y), v(x, y)];

describe('suggestFolder', () => {
  const centroids = new Map([['a', v(1, 0)], ['b', v(0, 1)]]);

  it('picks the nearest folder above the threshold', () => {
    expect(suggestFolder(v(1, 0.1), centroids, [])?.folderId).toBe('a');
  });

  it('returns null below the cosine threshold', () => {
    expect(suggestFolder(v(0.3, 1), new Map([['a', v(1, 0)]]), [])).toBeNull();
  });

  it('returns null when the margin over the second folder is too small', () => {
    expect(suggestFolder(v(1, 1), centroids, [])).toBeNull();
  });

  it('skips declined folders and has no centroid for a short meeting', () => {
    expect(suggestFolder(v(1, 0), centroids, ['a'])).toBeNull();
    expect(suggestFolder(null, centroids, [])).toBeNull();
  });

  it('ignores folders with fewer than 2 meetings', () => {
    expect(folderCentroids(new Map([['a', [v(1, 0)]], ['b', [v(0, 1), v(0, 1)]]])).has('a')).toBe(false);
  });
});

describe('computeFolderSuggestions', () => {
  const vectors: Record<string, Float32Array[]> = {
    f1: windows(1, 0), f2: windows(1, 0.05), g1: windows(0, 1), g2: windows(0.05, 1),
    new: windows(1, 0.1), tiny: [v(1, 0)],
  };
  const base = {
    sessionIds: ['f1', 'f2', 'g1', 'g2', 'new', 'tiny'],
    meetingFolders: { f1: 'A', f2: 'A', g1: 'B', g2: 'B', new: null, tiny: null } as Record<string, string | null>,
    declined: {} as Record<string, string[]>,
    loadVectors: (id: string) => vectors[id] ?? null,
  };

  it('suggests only for unfiled, sufficiently indexed meetings', () => {
    const out = computeFolderSuggestions(base);
    expect(Object.keys(out)).toEqual(['new']);
    expect(out.new.folderId).toBe('A');
  });

  it('never re-suggests a declined folder', () => {
    expect(computeFolderSuggestions({ ...base, declined: { new: ['A'] } })).toEqual({});
  });
});
