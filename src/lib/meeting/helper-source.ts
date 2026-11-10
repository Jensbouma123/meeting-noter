/**
 * The native system-audio helper (`helper/`, `npm run helper`) as a call
 * audio source.
 *
 * The helper taps everything the Mac plays with a Core Audio process tap,
 * before the output volume, and streams it over `ws://127.0.0.1:47853` as
 * 100 ms frames of 16 kHz mono Int16LE: the same frames the capture worklet
 * posts, so they go straight to the ASR/diarization path with no
 * AudioContext. It is how Safari, whose getDisplayMedia carries no audio,
 * records the far side of a call (see `helper/Sources/FrameServer.swift` for
 * the protocol). Asked with `mic`, it also mixes the Mac's default input
 * device into the same frames, so Safari records the user's voice without
 * opening the microphone itself. Asked with `mic` and `system: false`, it
 * streams the mic alone and starts no tap: Safari's Mic mode.
 */

export const HELPER_URL = 'ws://127.0.0.1:47853';
export const HELPER_PROTOCOL_VERSION = 1;
const SAMPLE_RATE = 16_000;
const FRAME_SAMPLES = 1600;
/** A refused localhost connection fails at once; this bounds a hung one. */
const PROBE_TIMEOUT_MS = 1500;
/** Starting the tap takes a few hundred ms. */
const START_TIMEOUT_MS = 4000;

type WebSocketCtor = new (url: string) => WebSocket;

export interface HelperHello {
  type: 'hello';
  version: number;
  sampleRate: number;
  format: string;
  frameSamples?: number;
  /** System Audio Recording: without it the helper streams exact silence. */
  permission?: 'granted' | 'denied' | 'unknown';
}

/** The helper's mic, mixed into the frames of a `mic` connection. An older
 *  helper says nothing: `'unavailable'`. `'silent'`: open, but delivering
 *  only digital silence (macOS withholds the Microphone permission, or the
 *  input is muted). */
export type HelperMicState = 'live' | 'unknown' | 'denied' | 'silent' | 'unavailable';

export interface HelperMic {
  state: HelperMicState;
  /** Microphone permission of the helper. */
  permission?: 'granted' | 'denied' | 'unknown';
  error?: string;
}

export interface HelperOptions {
  url?: string;
  /** Ask the helper to mix the default input device into the frames. */
  mic?: boolean;
  /** `false`: no system audio, only the mic (with `mic`). */
  system?: boolean;
  timeoutMs?: number;
  /** The WebSocket class; defaults to the page's. */
  WebSocket?: WebSocketCtor;
}

function pageWebSocket(): WebSocketCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { WebSocket?: WebSocketCtor }).WebSocket;
}

function parse(data: unknown): { type?: string; [key: string]: unknown } | null {
  if (typeof data !== 'string') return null;
  try {
    const msg = JSON.parse(data) as unknown;
    return msg && typeof msg === 'object' ? (msg as { type?: string }) : null;
  } catch {
    return null;
  }
}

function checkHello(msg: { [key: string]: unknown }): HelperHello {
  const hello = msg as unknown as HelperHello;
  if (hello.version !== HELPER_PROTOCOL_VERSION) {
    throw new Error(`System audio helper speaks protocol ${String(hello.version)}, this page ${HELPER_PROTOCOL_VERSION}: rebuild it (npm run helper)`);
  }
  if (hello.format !== 'pcm16' || hello.sampleRate !== SAMPLE_RATE) {
    throw new Error(`System audio helper sends ${String(hello.format)} at ${String(hello.sampleRate)} Hz, not pcm16 at 16 kHz`);
  }
  return hello;
}

function parseMic(msg: { [key: string]: unknown }): HelperMic {
  const states: HelperMicState[] = ['live', 'unknown', 'denied', 'silent', 'unavailable'];
  const state = states.find((s) => s === msg.mic) ?? 'unavailable';
  const mic: HelperMic = { state };
  if (msg.micPermission === 'granted' || msg.micPermission === 'denied' || msg.micPermission === 'unknown') {
    mic.permission = msg.micPermission;
  }
  if (typeof msg.micError === 'string') mic.error = msg.micError;
  else if (msg.mic === undefined) mic.error = 'this helper version does not record the microphone: rebuild it (npm run helper)';
  return mic;
}

/** Frame RMS in [0, 1], as the worklet reports it. */
export function int16Rms(frame: Int16Array): number {
  if (frame.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < frame.length; i += 1) {
    const x = frame[i] / 32768;
    sumSq += x * x;
  }
  return Math.min(1, Math.sqrt(sumSq / frame.length));
}

/**
 * One page's stream from the helper, live from `connectHelper()` until
 * `close()` or the socket drops. Frames are delivered to `onFrame`; until a
 * consumer sets it they are dropped, as a worklet node not yet connected
 * posts nothing either.
 */
export class HelperSource {
  readonly hello: HelperHello;
  onFrame: ((pcm: ArrayBuffer, rms: number) => void) | null = null;
  /** Fired once when the stream ends without `close()`. */
  onEnded: ((reason: string) => void) | null = null;
  /** The mic in the frames, mixed in or alone; `null` for a connection without `mic`. */
  mic: HelperMic | null;
  /** Fired when the helper's mic changes state mid-stream. */
  onMicChange: ((mic: HelperMic) => void) | null = null;
  private ws: WebSocket;
  private closed = false;
  /** Samples of a frame split across messages. */
  private partial = new Int16Array(FRAME_SAMPLES);
  private partialN = 0;

  /** @internal Use `connectHelper()`. */
  constructor(ws: WebSocket, hello: HelperHello, mic: HelperMic | null = null) {
    this.ws = ws;
    this.hello = hello;
    this.mic = mic;
    ws.onmessage = (ev: MessageEvent) => this.message(ev.data);
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
      // Already closing.
    }
  }

  private end(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.onFrame = null;
    this.onEnded?.(reason);
  }

  private message(data: unknown): void {
    if (this.closed) return;
    if (data instanceof ArrayBuffer) {
      this.frames(new Int16Array(data, 0, data.byteLength >> 1));
      return;
    }
    const msg = parse(data);
    if (msg?.type === 'error') this.end(String(msg.message ?? 'System audio helper error'));
    if (msg?.type === 'mic' && this.mic) {
      this.mic = parseMic(msg);
      this.onMicChange?.(this.mic);
    }
  }

  /** Re-cut whatever arrived into 1600-sample frames. */
  private frames(samples: Int16Array): void {
    let at = 0;
    if (this.partialN === 0) {
      while (samples.length - at >= FRAME_SAMPLES) {
        this.emit(samples.slice(at, at + FRAME_SAMPLES));
        at += FRAME_SAMPLES;
      }
    }
    while (at < samples.length) {
      const n = Math.min(FRAME_SAMPLES - this.partialN, samples.length - at);
      this.partial.set(samples.subarray(at, at + n), this.partialN);
      this.partialN += n;
      at += n;
      if (this.partialN === FRAME_SAMPLES) {
        this.emit(this.partial);
        this.partial = new Int16Array(FRAME_SAMPLES);
        this.partialN = 0;
      }
    }
  }

  private emit(frame: Int16Array): void {
    this.onFrame?.(frame.buffer as ArrayBuffer, int16Rms(frame));
  }
}

/** The last probe's or connection's answer; `null` before any. */
let reachable: boolean | null = null;

/**
 * Whether the helper answered the last time it was asked. A page that must
 * ask for a share synchronously (Chrome) can only use the helper when this
 * is already known.
 */
export function helperKnownReachable(): boolean {
  return reachable === true;
}

/** @internal For tests. */
export function resetHelperReachability(): void {
  reachable = null;
}

/** Open a socket and resolve with it and the helper's hello. */
function open(opts: HelperOptions, timeoutMs: number): Promise<{ ws: WebSocket; hello: HelperHello }> {
  const Ws = opts.WebSocket ?? pageWebSocket();
  if (!Ws) return Promise.reject(new Error('WebSockets are not available'));
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new Ws(opts.url ?? HELPER_URL);
    } catch (err) {
      // An https page blocks ws:// as mixed content right here.
      reject(new Error(`System audio helper unreachable: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }
    ws.binaryType = 'arraybuffer';
    const timer = setTimeout(() => fail(new Error('System audio helper did not answer')), timeoutMs);
    const fail = (err: Error): void => {
      clearTimeout(timer);
      ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close();
      } catch {
        // Never opened.
      }
      reject(err);
    };
    ws.onerror = () => fail(new Error('System audio helper is not running (npm run helper)'));
    ws.onclose = () => fail(new Error('System audio helper is not running (npm run helper)'));
    ws.onmessage = (ev: MessageEvent) => {
      const msg = parse(ev.data);
      if (msg?.type !== 'hello') return;
      clearTimeout(timer);
      try {
        resolve({ ws, hello: checkHello(msg) });
      } catch (err) {
        fail(err as Error);
      }
    };
  });
}

/**
 * Ask whether the helper is running, without starting its tap. Never
 * rejects; records the answer for `helperKnownReachable()`.
 */
export async function probeHelper(opts: HelperOptions = {}): Promise<boolean> {
  try {
    const { ws } = await open(opts, opts.timeoutMs ?? PROBE_TIMEOUT_MS);
    ws.onmessage = ws.onclose = ws.onerror = null;
    ws.close();
    reachable = true;
  } catch {
    reachable = false;
  }
  return reachable;
}

/**
 * Connect and start streaming. Resolves once the helper's tap runs; rejects
 * when the helper is not running, speaks another protocol, or its tap could
 * not start.
 */
export async function connectHelper(opts: HelperOptions = {}): Promise<HelperSource> {
  const timeoutMs = opts.timeoutMs ?? START_TIMEOUT_MS;
  let ws: WebSocket;
  let hello: HelperHello;
  try {
    ({ ws, hello } = await open(opts, timeoutMs));
  } catch (err) {
    reachable = false;
    throw err;
  }
  reachable = true;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => fail(new Error('System audio helper did not start its tap')), timeoutMs);
    const fail = (err: Error): void => {
      clearTimeout(timer);
      ws.onmessage = ws.onclose = ws.onerror = null;
      try {
        ws.close();
      } catch {
        // Closing already.
      }
      reject(err);
    };
    ws.onerror = ws.onclose = () => fail(new Error('System audio helper closed the connection'));
    ws.onmessage = (ev: MessageEvent) => {
      const msg = parse(ev.data);
      if (msg?.type === 'error') fail(new Error(String(msg.message ?? 'System audio helper could not start')));
      if (msg?.type !== 'started') return;
      clearTimeout(timer);
      resolve(new HelperSource(ws, hello, opts.mic ? parseMic(msg) : null));
    };
    ws.send(JSON.stringify(
      !opts.mic ? { type: 'start' } : opts.system === false ? { type: 'start', mic: true, system: false } : { type: 'start', mic: true },
    ));
  });
}
