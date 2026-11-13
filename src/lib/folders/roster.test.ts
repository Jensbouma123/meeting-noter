import { describe, expect, it } from 'vitest';
import type { FolderRow } from '@/lib/meeting-db/types';
import { mergeRoster, newRosterNames, planRosterSave, resolveFolderRoster } from './roster';

const folder = (id: string, parentId: string | null, roster: string[], inheritRoster: boolean): FolderRow => ({
  id,
  parentId,
  name: id,
  sort: 0,
  createdAt: 0,
  updatedAt: 0,
  roster,
  inheritRoster,
});

const rows = [
  folder('work', null, ['Anna', 'Piet'], false),
  folder('q1', 'work', [], true),
  folder('retro', 'q1', ['Sam'], false),
  folder('deep', 'retro', [], true),
  folder('loose', null, [], true),
];

describe('folder roster inheritance', () => {
  it('returns the folder roster for the folder that owns one', () => {
    expect(resolveFolderRoster(rows, 'work')).toEqual({ names: ['Anna', 'Piet'], sourceFolderId: 'work' });
  });

  it('passes an ancestor roster down through subfolders that inherit', () => {
    expect(resolveFolderRoster(rows, 'q1')).toEqual({ names: ['Anna', 'Piet'], sourceFolderId: 'work' });
    expect(resolveFolderRoster(rows, 'deep')).toEqual({ names: ['Sam'], sourceFolderId: 'retro' });
  });

  it('lets a subfolder override the inherited roster', () => {
    expect(resolveFolderRoster(rows, 'retro')).toEqual({ names: ['Sam'], sourceFolderId: 'retro' });
  });

  it('returns nothing when no ancestor owns a roster', () => {
    expect(resolveFolderRoster(rows, 'loose')).toEqual({ names: [], sourceFolderId: null });
    expect(resolveFolderRoster(rows, null)).toEqual({ names: [], sourceFolderId: null });
    expect(resolveFolderRoster(rows, 'missing')).toEqual({ names: [], sourceFolderId: null });
  });

  it('ignores a folder roster while inheritance is on', () => {
    const override = [...rows, folder('own', 'work', ['Els'], true)];
    expect(resolveFolderRoster(override, 'own')).toEqual({ names: ['Anna', 'Piet'], sourceFolderId: 'work' });
  });

  it('survives a parent cycle', () => {
    const cyclic = [folder('a', 'b', [], true), folder('b', 'a', [], true)];
    expect(resolveFolderRoster(cyclic, 'a')).toEqual({ names: [], sourceFolderId: null });
  });
});

describe('roster helpers', () => {
  it('merges and dedupes case-insensitively', () => {
    expect(mergeRoster(['Anna'], ['anna', 'Piet'])).toEqual(['Anna', 'Piet']);
    expect(newRosterNames(['Anna'], ['Anna', 'Sam'])).toEqual(['Sam']);
  });

  it('adds new people to the ancestor that owns the roster', () => {
    expect(planRosterSave(rows, 'q1', ['Anna', 'Els'])).toEqual({
      folderId: 'work',
      roster: ['Anna', 'Piet', 'Els'],
      inheritRoster: false,
    });
  });

  it('creates an override on the folder when no ancestor has a roster', () => {
    expect(planRosterSave(rows, 'loose', ['Els'])).toEqual({
      folderId: 'loose',
      roster: ['Els'],
      inheritRoster: false,
    });
  });

  it('writes nothing when every name is already known or the folder is gone', () => {
    expect(planRosterSave(rows, 'q1', ['Anna'])).toBeNull();
    expect(planRosterSave(rows, 'missing', ['Els'])).toBeNull();
    expect(planRosterSave(rows, null, ['Els'])).toBeNull();
  });
});
