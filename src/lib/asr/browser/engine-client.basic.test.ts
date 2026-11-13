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

describe('createBrowserASREngine', () => {
  it('runs the engine on the page when there is no Worker at all', async () => {
    vi.unstubAllGlobals();
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WASM, recorder().events);
    await engine.ensureLoaded();
    expect(local.instances).toHaveLength(1);
    expect(engine.isReady).toBe(true);
  });

  it('loads the model in the worker and mirrors its readiness', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const { events, log } = recorder();
    const engine = createBrowserASREngine(WASM, events);
    const loaded = engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);

    expect(worker.posted[0].message).toMatchObject({ type: 'init', config: { backend: 'wasm' } });
    const [call] = worker.calls('ensureLoaded');
    expect(call).toBeDefined();
    expect(engine.isReady).toBe(false);

    worker.emit({ type: 'status', status: 'loading', ready: false });
    worker.emit({ type: 'loadProgress', progress: { stage: 'session', done: 1, total: 1 } });
    worker.emit({ type: 'status', status: 'ready', ready: true });
    worker.emit({ type: 'reply', callId: call.callId, ok: true, ready: true });
    await loaded;

    expect(engine.isReady).toBe(true);
    expect(engine.getStatus()).toBe('ready');
    expect(log).toEqual(['status:loading', 'progress:session', 'status:ready']);
    expect(local.instances).toHaveLength(0);
  });

  it('hands the worker a transferred copy of the audio and returns its result', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const { events, log } = recorder();
    const engine = createBrowserASREngine(WASM, events);
    const audio = new Float32Array([0.25, -0.5, 0.75]);
    const result = engine.transcribe(audio, 'mic', 'mic:0', true);
    const worker = FakeWorker.instances[0];
    await started(worker);

    const [call] = worker.calls('transcribe');
    const posted = worker.posted.find((p) => p.message === call)!;
    const sent = (call.args as { audio: Float32Array }).audio;
    expect(sent).not.toBe(audio);
    expect(Array.from(sent)).toEqual([0.25, -0.5, 0.75]);
    expect(posted.transfer).toEqual([sent.buffer]);

    expect(Array.from(audio)).toEqual([0.25, -0.5, 0.75]);

    const segment = { id: 'browser-1', source: 'mic', speaker: 'mic:0', text: 'hallo', start: 0, end: 1, final: true };
    worker.emit({ type: 'segment', segment });
    const value = { segments: [segment], language: null, error: null };
    worker.emit({ type: 'reply', callId: call.callId, ok: true, ready: true, value });
    await expect(result).resolves.toEqual(value);
    expect(log).toContain('segment:hallo');
  });

  it('recognises a live window in the worker and returns its words', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WASM, recorder().events);
    const result = engine.recognize(new Float32Array([0.1, 0.2]));
    const worker = FakeWorker.instances[0];
    await started(worker);

    const [call] = worker.calls('recognize');
    const sent = (call.args as { audio: Float32Array }).audio;
    expect(worker.posted.find((p) => p.message === call)!.transfer).toEqual([sent.buffer]);
    const value = { text: 'hallo', words: [{ text: 'hallo', start: 0, end: 0.4 }], error: null };
    worker.emit({ type: 'reply', callId: call.callId, ok: true, ready: true, value });
    await expect(result).resolves.toEqual(value);
  });
});
