import type { KeyValueStore } from './types';

export function defaultKeyValueStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
