import type { BrowserASRConfig, BrowserASREvents, BrowserASRStatus } from './types';

type Listener = (ev: { data?: unknown; message?: string; preventDefault?: () => void }) => void;

export class FakeWorker {
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

export const WASM: BrowserASRConfig = {
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  language: 'nl',
  backend: 'wasm',
  encoderQuant: 'int8',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  asrBackend: 'wasm',
  files: ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'],
};

export const WEBGPU: BrowserASRConfig = { ...WASM, backend: 'webgpu-hybrid', encoderQuant: 'fp16', asrBackend: 'webgpu' };

export function recorder() {
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

export const tick = () => new Promise((r) => setTimeout(r, 0));

export async function started(worker: FakeWorker, webgpu = true): Promise<void> {
  worker.emit({ type: 'hello', webgpu });
  await tick();
}
