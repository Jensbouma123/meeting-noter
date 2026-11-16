import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { IdbSpillBackend } from './idb-spill-backend';

const range = (from: number, to: number) => Int16Array.from({ length: to - from }, (_, i) => from + i);

async function filled(factory: IDBFactory, spill: string): Promise<IdbSpillBackend> {
  const backend = await IdbSpillBackend.open(spill, factory);
  await backend.write(0, range(0, 10));
  await backend.write(10, range(10, 15));
  await backend.write(15, range(15, 30));
  return backend;
}

describe('IdbSpillBackend', () => {
  it('reads across chunk boundaries and stops at the end of data', async () => {
    const backend = await filled(new IDBFactory(), 'a');
    expect(Array.from(await backend.read(8, 10))).toEqual(Array.from(range(8, 18)));
    expect(Array.from(await backend.read(12, 2))).toEqual([12, 13]);
    expect(Array.from(await backend.read(25, 20))).toEqual(Array.from(range(25, 30)));
    expect((await backend.read(40, 5)).length).toBe(0);
  });

  it('truncates mid-chunk and appends after the cut', async () => {
    const backend = await filled(new IDBFactory(), 'a');
    await backend.truncate(12);
    expect(Array.from(await backend.read(0, 40))).toEqual(Array.from(range(0, 12)));
    await backend.write(12, Int16Array.of(-1, -2));
    expect(Array.from(await backend.read(10, 10))).toEqual([10, 11, -1, -2]);
  });

  it('keeps spills apart, clears stale data on open, and removes only its own chunks', async () => {
    const factory = new IDBFactory();
    const a = await filled(factory, 'a');
    const b = await filled(factory, 'b');
    await a.remove();
    expect(Array.from(await b.read(0, 3))).toEqual([0, 1, 2]);
    const reopened = await IdbSpillBackend.open('b', factory);
    expect((await reopened.read(0, 30)).length).toBe(0);
  });
});
