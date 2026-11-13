import { vi } from 'vitest';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k); },
    setItem: (k, v) => { data.set(k, String(v)); },
  };
}

export function installMemoryStorage(): void {
  vi.resetModules();
  const storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage });
}

export const snapshot = (sessionId: string) => ({
  sessionId,
  title: 'Standup',
  segments: [{ id: 's1', speakerId: 'mic:0', text: 'hello there', start: 0, end: 1, final: true }],
  speakers: {},
  startedAt: 1,
});

export const finalSegment = (id: string, start: number, end: number, text = `text ${id}`) => ({
  id, source: 'mic' as const, speaker: 'mic:0', text, start, end, final: true,
});

export async function loadMeetingStoreModules() {
  return {
    ...(await import('./store-core')),
    ...(await import('./session-reset')),
    ...(await import('./transcript-session')),
    ...(await import('./segment-store')),
  };
}

export function allStoredText(): string {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i)!;
    out.push(k, localStorage.getItem(k) ?? '');
  }
  return out.join('\n');
}
