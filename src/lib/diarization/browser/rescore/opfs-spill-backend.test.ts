import { describe, expect, it } from 'vitest';
import { OpfsSpillBackend } from './opfs-spill-backend';
import { fakeDirectory, fakeHandle } from './spill-test-support';

describe('OpfsSpillBackend', () => {
  it('stores Int16 samples at byte offset*2 and reads short at the end of file', async () => {
    const handle = fakeHandle();
    const backend = new OpfsSpillBackend(fakeDirectory(handle), 'a', handle);
    await backend.write(0, Int16Array.of(1, 2, 3));
    await backend.write(3, Int16Array.of(-4, 5));
    expect(handle.bytes().length).toBe(10);
    expect(Array.from(await backend.read(1, 3))).toEqual([2, 3, -4]);
    expect(Array.from(await backend.read(3, 10))).toEqual([-4, 5]);
  });

  it('truncates in samples and removes the file on remove', async () => {
    const handle = fakeHandle();
    const dir = fakeDirectory(handle);
    await dir.getFileHandle('spill', { create: true });
    const backend = new OpfsSpillBackend(dir, 'spill', handle);
    await backend.write(0, Int16Array.of(1, 2, 3, 4));
    await backend.truncate(2);
    expect(Array.from(await backend.read(0, 4))).toEqual([1, 2]);
    await backend.remove();
    expect(handle.closed()).toBe(true);
    expect(dir.files.has('spill')).toBe(false);
  });
});
