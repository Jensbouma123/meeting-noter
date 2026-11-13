import type { HelperHello, HelperOptions } from './types/helper';
import { HelperSource } from './helper-source';
import {
  HELPER_PROBE_TIMEOUT_MS,
  HELPER_START_TIMEOUT_MS,
  HELPER_URL,
  checkHello,
  closeSocketQuietly,
  detachSocketHandlers,
  pageWebSocket,
  parseHelperMessage,
  parseMic,
} from './helper-protocol';

let reachable: boolean | null = null;

export function helperKnownReachable(): boolean {
  return reachable === true;
}

export function resetHelperReachability(): void {
  reachable = null;
}

function openHelperSocket(opts: HelperOptions, timeoutMs: number): Promise<{ ws: WebSocket; hello: HelperHello }> {
  const Ws = opts.WebSocket ?? pageWebSocket();
  if (!Ws) return Promise.reject(new Error('WebSockets are not available'));
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new Ws(opts.url ?? HELPER_URL);
    } catch (err) {
      reject(new Error(`System audio helper unreachable: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }
    ws.binaryType = 'arraybuffer';
    const timer = setTimeout(() => fail(new Error('System audio helper did not answer')), timeoutMs);
    const fail = (err: Error): void => {
      clearTimeout(timer);
      detachSocketHandlers(ws);
      closeSocketQuietly(ws);
      reject(err);
    };
    ws.onerror = () => fail(new Error('System audio helper is not running (npm run helper)'));
    ws.onclose = () => fail(new Error('System audio helper is not running (npm run helper)'));
    ws.onmessage = (ev: MessageEvent) => {
      const msg = parseHelperMessage(ev.data);
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

export async function probeHelper(opts: HelperOptions = {}): Promise<boolean> {
  try {
    const { ws } = await openHelperSocket(opts, opts.timeoutMs ?? HELPER_PROBE_TIMEOUT_MS);
    detachSocketHandlers(ws);
    ws.close();
    reachable = true;
  } catch {
    reachable = false;
  }
  return reachable;
}

function startMessage(opts: HelperOptions): object {
  if (!opts.mic) return { type: 'start' };
  return opts.system === false ? { type: 'start', mic: true, system: false } : { type: 'start', mic: true };
}

export async function connectHelper(opts: HelperOptions = {}): Promise<HelperSource> {
  const timeoutMs = opts.timeoutMs ?? HELPER_START_TIMEOUT_MS;
  let ws: WebSocket;
  let hello: HelperHello;
  try {
    ({ ws, hello } = await openHelperSocket(opts, timeoutMs));
  } catch (err) {
    reachable = false;
    throw err;
  }
  reachable = true;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => fail(new Error('System audio helper did not start its tap')), timeoutMs);
    const fail = (err: Error): void => {
      clearTimeout(timer);
      detachSocketHandlers(ws);
      closeSocketQuietly(ws);
      reject(err);
    };
    ws.onerror = ws.onclose = () => fail(new Error('System audio helper closed the connection'));
    ws.onmessage = (ev: MessageEvent) => {
      const msg = parseHelperMessage(ev.data);
      if (msg?.type === 'error') fail(new Error(String(msg.message ?? 'System audio helper could not start')));
      if (msg?.type !== 'started') return;
      clearTimeout(timer);
      resolve(new HelperSource(ws, hello, opts.mic ? parseMic(msg) : null));
    };
    ws.send(JSON.stringify(startMessage(opts)));
  });
}
