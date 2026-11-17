export type LegacyEntry = [key: string, value: string];

export type LegacyMessage = { origin: string; data: unknown };

export type LegacyState = 'none' | 'listening' | 'busy' | 'expired' | 'done';

export type LegacyBridge = {
  state: LegacyState;
  root: string | null;
  close: (() => void) | null;
};

export type LegacyListenOptions = {
  port: number;
  appPort: number;
  version: string;
  windowMs?: number;
  onExpire?: () => void;
};

export type LegacySessionIndex = { version: number; sessions: { sessionId: string }[] };

export type LegacyResponse = { status: number; headers: Record<string, string>; body: string };

export type LegacyFetch = typeof fetch;

export type LegacyRequestExport = (win: Window) => Promise<LegacyEntry[] | null>;
