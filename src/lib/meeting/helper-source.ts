import type { HelperHello, HelperMic } from './types/helper';
import {
  HELPER_FRAME_SAMPLES,
  int16Rms,
  parseHelperMessage,
  parseMic,
} from './helper-protocol';

export class HelperSource {
  readonly hello: HelperHello;
  onFrame: ((pcm: ArrayBuffer, rms: number) => void) | null = null;
  onEnded: ((reason: string) => void) | null = null;
  mic: HelperMic | null;
  onMicChange: ((mic: HelperMic) => void) | null = null;
  private ws: WebSocket;
  private closed = false;
  private partial = new Int16Array(HELPER_FRAME_SAMPLES);
  private partialN = 0;

  constructor(ws: WebSocket, hello: HelperHello, mic: HelperMic | null = null) {
    this.ws = ws;
    this.hello = hello;
    this.mic = mic;
    ws.onmessage = (ev: MessageEvent) => this.receive(ev.data);
    ws.onclose = () => this.end('System audio helper disconnected');
    ws.onerror = () => this.end('System audio helper connection failed');
  }

  get live(): boolean {
    return !this.closed;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.onFrame = null;
    try {
      if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'stop' }));
      this.ws.close();
    } catch {
      return;
    }
  }

  private end(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.onFrame = null;
    this.onEnded?.(reason);
  }

  private receive(data: unknown): void {
    if (this.closed) return;
    if (data instanceof ArrayBuffer) {
      this.cutFrames(new Int16Array(data, 0, data.byteLength >> 1));
      return;
    }
    const msg = parseHelperMessage(data);
    if (msg?.type === 'error') this.end(String(msg.message ?? 'System audio helper error'));
    if (msg?.type === 'mic' && this.mic) {
      this.mic = parseMic(msg);
      this.onMicChange?.(this.mic);
    }
  }

  private cutFrames(samples: Int16Array): void {
    const size = HELPER_FRAME_SAMPLES;
    let at = 0;
    if (this.partialN === 0) {
      while (samples.length - at >= size) {
        this.emit(samples.slice(at, at + size));
        at += size;
      }
    }
    while (at < samples.length) {
      const n = Math.min(size - this.partialN, samples.length - at);
      this.partial.set(samples.subarray(at, at + n), this.partialN);
      this.partialN += n;
      at += n;
      if (this.partialN === size) {
        this.emit(this.partial);
        this.partial = new Int16Array(size);
        this.partialN = 0;
      }
    }
  }

  private emit(frame: Int16Array): void {
    this.onFrame?.(frame.buffer as ArrayBuffer, int16Rms(frame));
  }
}
