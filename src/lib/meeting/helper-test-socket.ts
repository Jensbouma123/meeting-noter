import type { FakeHelperMode } from './types/helper-test';

export class FakeHelperSocket {
  static instances: FakeHelperSocket[] = [];
  static mode: FakeHelperMode = 'helper';
  static permission = 'granted';
  static mic: string | undefined = 'live';

  readyState = 0;
  binaryType = 'blob';
  sent: string[] = [];
  closed = false;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;

  static reset(mode: FakeHelperMode = 'helper'): void {
    FakeHelperSocket.instances = [];
    FakeHelperSocket.mode = mode;
    FakeHelperSocket.permission = 'granted';
    FakeHelperSocket.mic = 'live';
  }

  constructor(readonly url: string) {
    if (FakeHelperSocket.mode === 'throws') throw new Error('SecurityError: insecure WebSocket from an https page');
    FakeHelperSocket.instances.push(this);
    queueMicrotask(() => {
      switch (FakeHelperSocket.mode) {
        case 'refused':
          this.readyState = 3;
          this.onerror?.({});
          this.onclose?.({});
          return;
        case 'hung':
          return;
        default:
          this.readyState = 1;
          this.text({
            type: 'hello',
            version: FakeHelperSocket.mode === 'old-protocol' ? 0 : 1,
            sampleRate: 16000,
            format: 'pcm16',
            frameSamples: 1600,
            permission: FakeHelperSocket.permission,
          });
      }
    });
  }

  get started(): boolean {
    return this.sent.some((m) => JSON.parse(m).type === 'start');
  }

    get askedMic(): boolean {
    return this.sent.some((m) => JSON.parse(m).type === 'start' && JSON.parse(m).mic === true);
  }

  send(data: string): void {
    this.sent.push(data);
    const msg = JSON.parse(data) as { type: string; mic?: boolean };
    if (msg.type !== 'start') return;
    queueMicrotask(() => {
      if (FakeHelperSocket.mode === 'tap-fails') {
        this.text({ type: 'error', message: 'Could not start the system audio tap' });
      } else {
        const mic = msg.mic && FakeHelperSocket.mic !== undefined
          ? { mic: FakeHelperSocket.mic, micPermission: FakeHelperSocket.mic === 'denied' ? 'denied' : 'granted' }
          : {};
        this.text({ type: 'started', sampleRate: 16000, ...mic });
      }
    });
  }

  close(): void {
    this.closed = true;
    this.readyState = 3;
  }

  text(msg: unknown): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

    samples(samples: Int16Array): void {
    this.onmessage?.({ data: samples.slice().buffer });
  }

    drop(): void {
    this.readyState = 3;
    this.onclose?.({});
  }
}

export function helperFrame(value: number, samples = 1600): Int16Array {
  return new Int16Array(samples).fill(value);
}
