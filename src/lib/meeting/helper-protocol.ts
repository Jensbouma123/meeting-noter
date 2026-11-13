import type { HelperHello, HelperMessage, HelperMic, HelperMicState, WebSocketCtor } from './types/helper';

export const HELPER_URL = 'ws://127.0.0.1:47853';
export const HELPER_PROTOCOL_VERSION = 1;
export const HELPER_SAMPLE_RATE = 16_000;
export const HELPER_FRAME_SAMPLES = 1600;
export const HELPER_PROBE_TIMEOUT_MS = 1500;
export const HELPER_START_TIMEOUT_MS = 4000;

const MIC_STATES: HelperMicState[] = ['live', 'unknown', 'denied', 'silent', 'unavailable'];

export function pageWebSocket(): WebSocketCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { WebSocket?: WebSocketCtor }).WebSocket;
}

export function parseHelperMessage(data: unknown): HelperMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const msg = JSON.parse(data) as unknown;
    return msg && typeof msg === 'object' ? (msg as HelperMessage) : null;
  } catch {
    return null;
  }
}

export function checkHello(msg: HelperMessage): HelperHello {
  const hello = msg as unknown as HelperHello;
  if (hello.version !== HELPER_PROTOCOL_VERSION) {
    throw new Error(`System audio helper speaks protocol ${String(hello.version)}, this page ${HELPER_PROTOCOL_VERSION}: rebuild it (npm run helper)`);
  }
  if (hello.format !== 'pcm16' || hello.sampleRate !== HELPER_SAMPLE_RATE) {
    throw new Error(`System audio helper sends ${String(hello.format)} at ${String(hello.sampleRate)} Hz, not pcm16 at 16 kHz`);
  }
  return hello;
}

export function parseMic(msg: HelperMessage): HelperMic {
  const state = MIC_STATES.find((s) => s === msg.mic) ?? 'unavailable';
  const mic: HelperMic = { state };
  if (msg.micPermission === 'granted' || msg.micPermission === 'denied' || msg.micPermission === 'unknown') {
    mic.permission = msg.micPermission;
  }
  if (typeof msg.micError === 'string') mic.error = msg.micError;
  else if (msg.mic === undefined) mic.error = 'this helper version does not record the microphone: rebuild it (npm run helper)';
  return mic;
}

export function int16Rms(frame: Int16Array): number {
  if (frame.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < frame.length; i += 1) {
    const x = frame[i] / 32768;
    sumSq += x * x;
  }
  return Math.min(1, Math.sqrt(sumSq / frame.length));
}

export function closeSocketQuietly(ws: WebSocket): void {
  try {
    ws.close();
  } catch {
    return;
  }
}

export function detachSocketHandlers(ws: WebSocket): void {
  ws.onmessage = ws.onclose = ws.onerror = null;
}
