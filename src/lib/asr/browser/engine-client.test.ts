import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserASRConfig, BrowserASREvents, BrowserASRStatus } from './types';

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

type Listener = (ev: { data?: unknown; message?: string; preventDefault?: () => void }) => void;

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly posted: Array<{ message: Record<string, unknown>; transfer: Transferable[] }> = [];
  onmessage: Listener | null = null;
  onerror: Listener | null = null;
  onmessageerror: Listener | null = null;
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, fn: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }

  removeEventListener(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn);
  }

  postMessage(message: Record<string, unknown>, transfer: Transferable[] = []): void {
    this.posted.push({ message, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: unknown): void {
    for (const fn of this.listeners.get('message') ?? []) fn({ data });
    this.onmessage?.({ data });
  }

  fail(message: string): void {
    const ev = { message, preventDefault: () => {} };
    for (const fn of this.listeners.get('error') ?? []) fn(ev);
    this.onerror?.(ev);
  }

  calls(method: string): Array<Record<string, unknown>> {
    return this.posted.map((p) => p.message).filter((m) => m.type === 'call' && m.method === method);
  }
}

const WASM: BrowserASRConfig = {
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  language: 'nl',
  backend: 'wasm',
  encoderQuant: 'int8',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  asrBackend: 'wasm',
  files: ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'],
};

const WEBGPU: BrowserASRConfig = { ...WASM, backend: 'webgpu-hybrid', encoderQuant: 'fp16', asrBackend: 'webgpu' };

function recorder() {
  const log: string[] = [];
  const statuses: BrowserASRStatus[] = [];
  const errors: string[] = [];
  const events: BrowserASREvents = {
    onSegment: (seg) => log.push(`segment:${seg.text}`),
    onLanguage: () => log.push('language'),
    onStatusChange: (status) => {
      statuses.push(status);
      log.push(`status:${status}`);
    },
    onError: (message) => errors.push(message),
    onLoadProgress: (p) => log.push(`progress:${p.stage}`),
  };
  return { events, log, statuses, errors };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

async function started(worker: FakeWorker, webgpu = true): Promise<void> {
  worker.emit({ type: 'hello', webgpu });
  await tick();
}

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

  it('runs a WebGPU model on the page when the worker scope has no WebGPU', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WEBGPU, recorder().events);
    const loaded = engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker, false);
    await loaded;

    expect(worker.terminated).toBe(true);
    expect(local.instances).toHaveLength(1);
    expect(engine.isReady).toBe(true);
  });

  it('runs the engine on the page when the worker script fails to start', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = createBrowserASREngine(WASM, recorder().events);
    const loaded = engine.ensureLoaded();
    FakeWorker.instances[0].fail('SyntaxError');
    await loaded;

    expect(local.instances).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('gives the worker the word list at start and on every change, until disable()', async () => {
    const vocab = await import('@/lib/vocabulary/store');
    vocab.resetVocabularyForTests();
    vocab.addVocabularyEntries([{ word: 'Framna', variants: [] }]);
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WASM, recorder().events);
    void engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);

    expect(worker.calls('setVocabulary').map((c) => c.args)).toEqual([
      { words: ['Framna'], strength: vocab.getVocabulary().strength },
    ]);
    vocab.addVocabularyEntries([{ word: 'Hezelaer', variants: [] }]);
    expect(worker.calls('setVocabulary').at(-1)?.args).toMatchObject({ words: ['Framna', 'Hezelaer'] });

    engine.disable();
    const sent = worker.calls('setVocabulary').length;
    vocab.addVocabularyEntries([{ word: 'Acme', variants: [] }]);
    expect(worker.calls('setVocabulary')).toHaveLength(sent);
    vocab.resetVocabularyForTests();
  });

  it('sends no word list to a worker when the list is empty', async () => {
    const vocab = await import('@/lib/vocabulary/store');
    vocab.resetVocabularyForTests();
    const { createBrowserASREngine } = await import('./engine-client');
    void createBrowserASREngine(WASM, recorder().events).ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);
    expect(worker.calls('setVocabulary')).toEqual([]);
  });
});
