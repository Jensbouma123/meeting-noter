import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FolderRow } from '@/lib/meeting-db/types';
import { createFakeEmbedder } from '../fake-embedder';
import { SearchModelNotReadyError } from '../service';
import { computeFolderSuggestions } from './compute';
import { clearContextVectorCache, loadFolderContextVectors } from './context-vector';
import { folderCentroids } from './suggest';
import type { ContextVectorDeps } from './types/context-vector-deps';

const v = (...n: number[]) => new Float32Array(n);
const windows = (x: number, y: number) => [v(x, y), v(x, y), v(x, y)];
const folder = (id: string, name: string, context: string): FolderRow => ({
  id,
  parentId: null,
  name,
  sort: 0,
  createdAt: 0,
  updatedAt: 0,
  roster: [],
  inheritRoster: true,
  context,
});
const embedderDeps = (): ContextVectorDeps => {
  const embedder = createFakeEmbedder();
  return { run: (task) => task(embedder) };
};

beforeEach(clearContextVectorCache);

describe('folder context vector', () => {
  it('embeds name + context and caches until the text changes', async () => {
    const embed = vi.fn(async (texts: string[]) => texts.map(() => v(1, 0)));
    const deps: ContextVectorDeps = { run: (task) => task({ dim: 2, embed } as never) };
    const f = folder('a', 'Design', 'weekly syncs');
    expect(Object.keys(await loadFolderContextVectors([f], deps))).toEqual(['a']);
    await loadFolderContextVectors([f], deps);
    expect(embed).toHaveBeenCalledTimes(1);
    expect(embed.mock.calls[0][0]).toEqual(['Design\nweekly syncs']);
    await loadFolderContextVectors([folder('a', 'Design', 'new text')], deps);
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it('skips folders without context and silently skips when the model is not loaded', async () => {
    const run = vi.fn(async () => {
      throw new SearchModelNotReadyError();
    });
    expect(await loadFolderContextVectors([folder('a', 'A', '  ')], { run })).toEqual({});
    expect(run).not.toHaveBeenCalled();
    expect(await loadFolderContextVectors([folder('b', 'B', 'ctx')], { run })).toEqual({});
  });

  it('real embedder: related text is closer than unrelated text', async () => {
    const out = await loadFolderContextVectors(
      [folder('a', 'Budget', 'quarterly budget forecast finance')],
      embedderDeps(),
    );
    expect(out.a.length).toBeGreaterThan(0);
  });
});

describe('context in suggestions', () => {
  const vectors: Record<string, Float32Array[]> = { new: windows(1, 0.1), g1: windows(0, 1), g2: windows(0.05, 1) };
  const base = {
    sessionIds: ['new', 'g1', 'g2'],
    meetingFolders: { new: null, g1: 'B', g2: 'B' } as Record<string, string | null>,
    declined: {},
    loadVectors: (id: string) => vectors[id] ?? null,
  };

  it('suggests an empty folder through its context vector', () => {
    const out = computeFolderSuggestions({ ...base, contextVectors: { A: v(1, 0) } });
    expect(out.new?.folderId).toBe('A');
  });

  it('without context an empty folder is never suggested', () => {
    expect(computeFolderSuggestions(base)).toEqual({});
  });

  it('meetings dominate the context vector as they accumulate', () => {
    const meetings = Array.from({ length: 20 }, () => v(0, 1));
    const centroid = folderCentroids(new Map([['A', meetings]]), { A: v(1, 0) }).get('A')!;
    expect(centroid[1]).toBeGreaterThan(0.99);
    const alone = folderCentroids(new Map(), { A: v(1, 0) }).get('A')!;
    expect(alone[0]).toBeCloseTo(1);
  });

  it('folders without context behave as before', () => {
    expect(folderCentroids(new Map([['a', [v(1, 0)]]])).has('a')).toBe(false);
  });
});
