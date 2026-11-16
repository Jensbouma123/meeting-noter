import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { openSpillBackend } from './spill-backend';
import { fakeDirectory, fakeHandle } from './spill-test-support';

describe('openSpillBackend', () => {
  it('uses OPFS when a sync access handle is available and starts empty', async () => {
    const handle = fakeHandle();
    handle.write(Uint8Array.of(1, 2, 3, 4), { at: 0 });
    const backend = await openSpillBackend('s', { getDirectory: async () => fakeDirectory(handle) });
    expect(backend.kind).toBe('opfs');
    expect(handle.bytes().length).toBe(0);
  });

  it('falls back to IndexedDB without sync access handles and drops the empty file', async () => {
    const dir = fakeDirectory(null);
    const backend = await openSpillBackend('s', { getDirectory: async () => dir, indexedDB: new IDBFactory() });
    expect(backend.kind).toBe('indexeddb');
    expect(dir.files.size).toBe(0);
  });

  it('falls back to IndexedDB when OPFS throws', async () => {
    const env = {
      getDirectory: async () => {
        throw new Error('denied');
      },
      indexedDB: new IDBFactory(),
    };
    expect((await openSpillBackend('s', env)).kind).toBe('indexeddb');
  });

  it('rejects when no storage exists', async () => {
    await expect(openSpillBackend('s', {})).rejects.toThrow('No spill storage');
  });
});
