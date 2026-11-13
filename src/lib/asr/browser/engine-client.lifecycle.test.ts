import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeWorker, WASM, WEBGPU, recorder, started, tick } from './engine-client.test-support';

const local = vi.hoisted(() => ({ instances: [] as Array<{ config: unknown }> }));

vi.mock('./parakeet', () => ({
  BrowserASREngine: class {
    isReady = false;
    constructor(public config: unknown) {
      local.instances.push(this);
    }
    getStatus(): string {
      return 'idle';
    }
    async ensureLoaded(): Promise<void> {
      this.isReady = true;
    }
  },
}));

beforeEach(() => {
  FakeWorker.instances.length = 0;
  local.instances.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserASREngine lifecycle', () => {
  it('settles a live window as "not ready" on disable(), not as a hang', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WASM, recorder().events);
    const result = engine.recognize(new Float32Array(4));
    await started(FakeWorker.instances[0]);
    engine.disable();
    await expect(result).resolves.toEqual({ text: '', words: [], error: 'Model not ready' });
  });

  it('passes a failed load through as the rejection the in-thread engine throws', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WASM, recorder().events);
    const loaded = engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);
    const [call] = worker.calls('ensureLoaded');
    worker.emit({ type: 'reply', callId: call.callId, ok: false, ready: false, error: 'out of memory' });
    await expect(loaded).rejects.toThrow('out of memory');
  });

  it('fails what is in flight when the worker dies, instead of hanging', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const { events, statuses, errors } = recorder();
    const engine = createBrowserASREngine(WASM, events);
    const loaded = engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);

    worker.fail('Out of memory');
    await expect(loaded).rejects.toThrow('Out of memory');
    expect(worker.terminated).toBe(true);
    expect(statuses.at(-1)).toBe('error');
    expect(engine.isReady).toBe(false);

    const result = await engine.transcribe(new Float32Array(4), 'mic', 'mic:0', false);
    expect(result.error).toBe('Out of memory');
    expect(errors).toEqual(['Browser ASR transcription error: Out of memory']);
  });

  it('terminates the worker on disable() and settles what was in flight', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const { events, statuses } = recorder();
    const engine = createBrowserASREngine(WASM, events);
    const result = engine.transcribe(new Float32Array(4), 'mic', 'mic:0', false);
    const worker = FakeWorker.instances[0];
    await started(worker);

    engine.disable();
    expect(worker.terminated).toBe(true);
    await expect(result).resolves.toEqual({ segments: [], language: null, error: 'Model not ready' });
    expect(statuses.at(-1)).toBe('disabled');
    expect(engine.getStatus()).toBe('disabled');
  });
});
