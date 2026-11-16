import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDiarizer } from './index';
import { FakeWorker } from './index-test-support';
import { seedSpeakerStates, takeReportedSpeakerStates } from './speaker-handoff';
import type { SerializedSpeakerState } from './types';

beforeEach(() => {
  FakeWorker.instances.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createDiarizer — one worker, released with the last diarizer', () => {
  it('shares the worker across sources and keeps it until the last one goes', () => {
    const mic = createDiarizer({ source: 'mic' });
    const system = createDiarizer({ source: 'system' });
    expect(FakeWorker.instances).toHaveLength(1);

    mic.dispose();
    expect(FakeWorker.instances[0].terminated).toBe(false);

    system.dispose();
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });

  it('routes a speaker turn only to the diarizer it belongs to', () => {
    const mic = createDiarizer({ source: 'mic' });
    const system = createDiarizer({ source: 'system' });
    const worker = FakeWorker.instances[0];
    const micTurns: string[] = [];
    const systemTurns: string[] = [];
    mic.onSpeakerTurn((t) => micTurns.push(t.speaker));
    system.onSpeakerTurn((t) => systemTurns.push(t.speaker));

    const systemId = (worker.posted[1] as { id: string }).id;
    worker.emit({ type: 'turn', id: systemId, turn: { speaker: 'system:1' } });

    expect(systemTurns).toEqual(['system:1']);
    expect(micTurns).toEqual([]);

    mic.dispose();
    system.dispose();
  });

  it('stops pushing after dispose, and lets a later session start fresh', () => {
    const mic = createDiarizer({ source: 'mic' });
    const first = FakeWorker.instances[0];
    mic.push(new Float32Array([0.1, 0.2]));
    expect(first.posted.filter((m) => (m as { type: string }).type === 'push')).toHaveLength(1);

    mic.dispose();
    mic.push(new Float32Array([0.3]));
    expect(first.posted.filter((m) => (m as { type: string }).type === 'push')).toHaveLength(1);
    expect((first.posted[first.posted.length - 1] as { type: string }).type).toBe('dispose');

    const again = createDiarizer({ source: 'mic' });
    expect(FakeWorker.instances).toHaveLength(2);
    again.dispose();
  });

  it('starts a source from its seeded speaker state, and keeps the state its flush reports', async () => {
    const seed: SerializedSpeakerState = {
      version: 1,
      hiddenSize: 512,
      numSpeakers: 8,
      numFrames: 0,
      compressed: false,
      embeds: '',
      probs: '',
    };
    seedSpeakerStates({ system: seed });
    const mic = createDiarizer({ source: 'mic' });
    const system = createDiarizer({ source: 'system' });
    const worker = FakeWorker.instances[0];
    const [micInit, systemInit] = worker.posted as { id: string; speakerState?: unknown }[];
    expect(micInit.speakerState).toBeUndefined();
    expect(systemInit.speakerState).toBe(seed);

    const flushed = system.flush();
    const reported = { ...seed, numFrames: 3 };
    worker.emit({ type: 'flushed', id: systemInit.id, speakerState: reported });
    await flushed;
    expect(takeReportedSpeakerStates()).toEqual({ system: reported });

    seedSpeakerStates(null);
    mic.dispose();
    system.dispose();
  });
});
