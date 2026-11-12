import { describe, expect, it } from 'vitest';
import type { FolderRow } from '@/lib/meeting-db/types';
import { buildFolderTree, canMoveFolder, countByFolder, folderPath, folderPickerOptions, folderSubtreeIds } from './folder-tree';

const f = (id: string, parentId: string | null, name = id): FolderRow => ({ id, parentId, name, sort: 0, createdAt: 0, updatedAt: 0 });
const rows = [f('a', null, 'Work'), f('b', 'a', 'Q1'), f('c', 'b', 'Retro'), f('d', null, 'Home')];

describe('folder tree helpers', () => {
  it('nests children under parents', () => {
    const tree = buildFolderTree(rows);
    expect(tree.map((n) => n.folder.id)).toEqual(['a', 'd']);
    expect(tree[0].children[0].children[0].folder.id).toBe('c');
  });
  it('builds a name path and tolerates unknown ids', () => {
    expect(folderPath(rows, 'c')).toEqual(['Work', 'Q1', 'Retro']);
    expect(folderPath(rows, 'zzz')).toEqual([]);
    expect(folderPath(rows, null)).toEqual([]);
  });
  it('collects the subtree', () => {
    expect([...folderSubtreeIds(rows, 'a')].sort()).toEqual(['a', 'b', 'c']);
  });
  it('refuses cycles and no-op moves', () => {
    expect(canMoveFolder(rows, 'a', 'c')).toBe(false);
    expect(canMoveFolder(rows, 'a', 'a')).toBe(false);
    expect(canMoveFolder(rows, 'b', 'a')).toBe(false);
    expect(canMoveFolder(rows, 'c', null)).toBe(true);
    expect(canMoveFolder(rows, 'd', 'a')).toBe(true);
  });
  it('lists picker options with depth, excluding a subtree', () => {
    expect(folderPickerOptions(rows).map((o) => `${o.depth}${o.id}`)).toEqual(['0a', '1b', '2c', '0d']);
    expect(folderPickerOptions(rows, folderSubtreeIds(rows, 'b')).map((o) => o.id)).toEqual(['a', 'd']);
  });
  it('counts meetings per folder', () => {
    expect(countByFolder({ m1: 'a', m2: 'a', m3: null }).get('a')).toBe(2);
  });
  it('shows a folder whose parent is unknown at the root', () => {
    const tree = buildFolderTree([f('x', 'missing', 'Orphan'), f('y', null, 'Home')]);
    expect(tree.map((n) => n.folder.id)).toEqual(['x', 'y']);
    expect(folderPickerOptions([f('x', 'missing', 'Orphan')]).map((o) => `${o.depth}${o.id}`)).toEqual(['0x']);
  });
  it('keeps the folder order it was given among siblings', () => {
    const tree = buildFolderTree([f('z', null, 'Zeta'), f('a', null, 'Alpha')]);
    expect(tree.map((n) => n.folder.name)).toEqual(['Zeta', 'Alpha']);
  });
  it('gives an empty path when a folder id is missing from the rows', () => {
    expect(folderPath([], 'a')).toEqual([]);
  });
  it('stops a corrupt parent loop instead of hanging', () => {
    const looped = [f('p', 'q', 'P'), f('q', 'p', 'Q')];
    expect(folderPath(looped, 'p')).toEqual(['Q', 'P']);
  });
  it('rejects moving a folder into its own child, and unknown folders', () => {
    expect(canMoveFolder(rows, 'zzz', null)).toBe(false);
    expect(canMoveFolder(rows, 'a', 'b')).toBe(false);
  });
  it('excludes nothing from the picker when no subtree is given', () => {
    expect(folderPickerOptions(rows).length).toBe(rows.length);
  });
  it('counts nothing for unfiled meetings only', () => {
    expect(countByFolder({ m1: null, m2: null }).size).toBe(0);
  });
});
