export type WebSocketCtor = new (url: string) => WebSocket;

export interface HelperHello {
  type: 'hello';
  version: number;
  sampleRate: number;
  format: string;
  frameSamples?: number;
  permission?: 'granted' | 'denied' | 'unknown';
}

export type HelperMicState = 'live' | 'unknown' | 'denied' | 'silent' | 'unavailable';

export interface HelperMic {
  state: HelperMicState;
  permission?: 'granted' | 'denied' | 'unknown';
  error?: string;
}

export interface HelperOptions {
  url?: string;
  mic?: boolean;
  system?: boolean;
  timeoutMs?: number;
  WebSocket?: WebSocketCtor;
}

export type HelperMessage = { type?: string; [key: string]: unknown };
