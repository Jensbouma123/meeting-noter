import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLanguageDetector } from './index';

class FakeWorker {
  static instances: FakeWorker[] = [];

  readonly listeners = new Set<(ev: MessageEvent<unknown>) => void>();
  readonly posted: Array<{ message: unknown; transfer?: Transferable[] }> = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(_type: string, fn: (ev: MessageEvent<unknown>) => void): void {
    this.listeners.add(fn);
  }

  removeEventListener(_type: string, fn: (ev: MessageEvent<unknown>) => void): void {
    this.listeners.delete(fn);
  }

  postMessage(message: unknown, transfer?: Transferable[]): void {
    this.posted.push({ message, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: unknown): void {
    for (const fn of this.listeners) fn({ data: message } as MessageEvent<unknown>);
  }
}

beforeEach(() => {
  FakeWorker.instances.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createLanguageDetector — one worker for the page', () => {
  it('shares a single worker across detectors, and terminates it with the last one', () => {
    const mic = createLanguageDetector();
    const system = createLanguageDetector();
    expect(FakeWorker.instances).toHaveLength(1);

    mic.dispose();
    expect(FakeWorker.instances[0].terminated).toBe(false);

    system.dispose();
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });

  it('tags every message with its own id and routes results back to that detector only', () => {
    const mic = createLanguageDetector();
    const system = createLanguageDetector();
    const worker = FakeWorker.instances[0];

    mic.push(new Float32Array([0.1, 0.2]));
    system.push(new Float32Array([0.3]));

    const [micPush, systemPush] = worker.posted.filter((p) => (p.message as { type: string }).type === 'push');
    expect((micPush.message as { type: string }).type).toBe('push');
    const micId = (micPush.message as { id: string }).id;
    const systemId = (systemPush.message as { id: string }).id;
    expect(micId).not.toBe(systemId);
    expect(micPush.transfer).toHaveLength(1);

    const micResults: string[] = [];
    const systemResults: string[] = [];
    mic.onLanguage(({ code }) => micResults.push(code));
    system.onLanguage(({ code }) => systemResults.push(code));

    worker.emit({ type: 'language', id: systemId, code: 'nl', name: 'Nederlands', confidence: 0.9 });

    expect(systemResults).toEqual(['nl']);
    expect(micResults).toEqual([]);

    mic.dispose();
    system.dispose();
  });

  it('drops the source on dispose and stops pushing for it', () => {
    const mic = createLanguageDetector();
    const worker = FakeWorker.instances[0];
    mic.push(new Float32Array([0.1]));

    mic.dispose();

    const last = worker.posted[worker.posted.length - 1].message as { type: string; id: string };
    expect(last.type).toBe('dispose');
    expect(last.id).toBe((worker.posted.find((p) => (p.message as { type: string }).type === 'push')!.message as { id: string }).id);

    mic.push(new Float32Array([0.5]));
    expect(worker.posted.filter((p) => (p.message as { type: string }).type === 'push')).toHaveLength(1);
  });

  it('registers each source with the worker before its first push', () => {
    const mic = createLanguageDetector();
    const worker = FakeWorker.instances[0];
    mic.push(new Float32Array([0.1]));

    const [init, push] = worker.posted.map((p) => p.message as { type: string; id: string });
    expect(init.type).toBe('init');
    expect(push.type).toBe('push');
    expect(push.id).toBe(init.id);
    mic.dispose();
  });

  it('transfers an owned buffer as is instead of copying it first', () => {
    const mic = createLanguageDetector();
    const worker = FakeWorker.instances[0];
    const owned = new Float32Array([0.1, 0.2]);
    const borrowed = new Float32Array([0.3]);

    mic.push(owned, true);
    mic.push(borrowed);

    const [ownedPush, borrowedPush] = worker.posted
      .filter((p) => (p.message as { type: string }).type === 'push')
      .map((p) => (p.message as { samples: Float32Array }).samples);
    expect(ownedPush).toBe(owned);
    expect(borrowedPush).not.toBe(borrowed);
    expect(Array.from(borrowedPush)).toEqual(Array.from(borrowed));

    const view = new Float32Array(4).subarray(1, 3);
    mic.push(view, true);
    const last = worker.posted[worker.posted.length - 1].message as { samples: Float32Array };
    expect(last.samples).not.toBe(view);
    mic.dispose();
  });
});
