import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { AudioSpill } from './audio-spill';
import { fakeDirectory, fakeHandle } from './spill-test-support';

const ramp = (from: number, length: number) => Int16Array.from({ length }, (_, i) => (from + i) % 30000);

describe('AudioSpill', () => {
  it('coalesces appends into staged writes and returns running offsets', async () => {
    const handle = fakeHandle();
    const spill = await AudioSpill.open('x', { getDirectory: async () => fakeDirectory(handle) });
    expect(spill.append(ramp(0, 100))).toBe(0);
    expect(spill.append(ramp(100, 50))).toBe(100);
    expect(handle.bytes().length).toBe(0);
    spill.append(ramp(150, 20000));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(handle.bytes().length).toBe(32000);
    await spill.flush();
    expect(handle.bytes().length).toBe(40300);
    expect(spill.length).toBe(20150);
  });

  it('rewinds inside staging and across written data, dropping later runs', async () => {
    const spill = await AudioSpill.open('x', { indexedDB: new IDBFactory() });
    spill.append(ramp(0, 17000));
    spill.addRun({ channel: 0, startFrame: 0, endFrame: 10, offset: 0, length: 1840 });
    spill.addRun({ channel: 1, startFrame: 10, endFrame: 100, offset: 1840, length: 15000 });
    spill.rewind(16500);
    expect(spill.length).toBe(16500);
    spill.rewind(1840);
    expect(spill.runs.map((r) => r.channel)).toEqual([0]);
    spill.append(Int16Array.of(-7, -8));
    spill.addRun({ channel: 2, startFrame: 0, endFrame: 0, offset: 1840, length: 2 });
    expect(Array.from(await spill.readWindow({ channel: 2, start: 0, end: 0 }))).toEqual([-7, -8]);
  });

  it('reads a window inside a run with the 240-sample tail clamped to the run', async () => {
    const spill = await AudioSpill.open('x', { getDirectory: async () => fakeDirectory(fakeHandle()) });
    spill.append(ramp(0, 500));
    spill.append(ramp(1000, 200 * 160 + 240));
    spill.addRun({ channel: 3, startFrame: 40, endFrame: 240, offset: 500, length: 200 * 160 + 240 });
    const mid = await spill.readWindow({ channel: 3, start: 50, end: 60 });
    expect(mid.length).toBe(10 * 160 + 240);
    expect(mid[0]).toBe(1000 + 10 * 160);
    const last = await spill.readWindow({ channel: 3, start: 200, end: 240 });
    expect(last.length).toBe(40 * 160 + 240);
    expect(last[last.length - 1]).toBe((1000 + 200 * 160 + 239) % 30000);
    expect((await spill.readWindow({ channel: 1, start: 50, end: 60 })).length).toBe(0);
  });

  it('deletes the backing file and forgets runs', async () => {
    const dir = fakeDirectory(fakeHandle());
    const spill = await AudioSpill.open('gone', { getDirectory: async () => dir });
    spill.append(ramp(0, 10));
    spill.addRun({ channel: 0, startFrame: 0, endFrame: 1, offset: 0, length: 10 });
    await spill.delete();
    expect(dir.files.has('gone')).toBe(false);
    expect(spill.runs).toEqual([]);
  });
});
