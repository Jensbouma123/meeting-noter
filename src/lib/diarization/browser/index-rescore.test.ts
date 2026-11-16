import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDiarizer } from './index';
import { FakeWorker } from './index-test-support';
import type { SpeakerTurn } from './types';

const turn: SpeakerTurn = { speaker: 'mic:1', source: 'mic', start: 0, end: 2, id: 'mic#0', final: true };

beforeEach(() => {
  FakeWorker.instances.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function flushedWith(rescoring: boolean) {
  const mic = createDiarizer({ source: 'mic' });
  const worker = FakeWorker.instances[0];
  const id = (worker.posted[0] as { id: string }).id;
  const flushed = mic.flush();
  worker.emit({ type: 'flushed', id, ...(rescoring ? { rescoring: true } : {}) });
  await flushed;
  return { mic, worker, id };
}

describe('createDiarizer — rescored turns arrive after dispose', () => {
  it('keeps the worker past dispose and hands the rescored turns to onRescored', async () => {
    const { mic, worker, id } = await flushedWith(true);
    const received: SpeakerTurn[][] = [];
    mic.onRescored((turns) => received.push(turns));

    mic.dispose();
    expect(worker.terminated).toBe(false);
    expect(worker.listeners.size).toBe(1);

    worker.emit({ type: 'rescored', id, turns: [turn] });
    expect(received).toEqual([[turn]]);
    expect(worker.terminated).toBe(true);
    expect(worker.listeners.size).toBe(0);
  });

  it('releases the worker without calling onRescored when the rescore produced nothing', async () => {
    const { mic, worker, id } = await flushedWith(true);
    const onRescored = vi.fn();
    mic.onRescored(onRescored);

    mic.dispose();
    worker.emit({ type: 'rescored', id });
    expect(onRescored).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
  });

  it('releases the worker on dispose when the flush started no rescore', async () => {
    const { mic, worker } = await flushedWith(false);
    mic.dispose();
    expect(worker.terminated).toBe(true);
    expect(worker.listeners.size).toBe(0);
  });

  it('keeps the shared worker for a pending rescore after the other source is disposed', async () => {
    const { mic, worker, id } = await flushedWith(true);
    const system = createDiarizer({ source: 'system' });
    mic.dispose();
    system.dispose();
    expect(worker.terminated).toBe(false);

    worker.emit({ type: 'rescored', id, turns: [turn] });
    expect(worker.terminated).toBe(true);
  });
});
