import { dropPendingAutosave } from './autosave';

let clientSessionId: string | null = null;

export function getClientSessionId(): string {
  if (clientSessionId) return clientSessionId;
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function') {
      clientSessionId = c.randomUUID();
    } else {
      clientSessionId = `mn-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
    }
  } catch {
    clientSessionId = `mn-${Date.now().toString(36)}`;
  }
  return clientSessionId as string;
}

export function rotateClientSessionId(): string {
  clientSessionId = null;
  dropPendingAutosave();
  return getClientSessionId();
}
