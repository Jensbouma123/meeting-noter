import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addAction, getNotesSnapshot } from './notes';

function installStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  });
}

describe('notes snapshot without a subscriber', () => {
  beforeEach(installStorage);
  afterEach(() => vi.unstubAllGlobals());

  it('reflects a write made between the first read and the subscription', () => {
    expect(getNotesSnapshot('gap').actions).toHaveLength(0);
    addAction('gap', 'Added before subscribe');
    expect(getNotesSnapshot('gap').actions).toHaveLength(1);
  });
});
