import { compareVersions } from '../update/version.mjs';
import { LAST_SEEN_KEY } from './constants';
import type { MetaStore } from './whats-new.types';

export function shouldShowWhatsNew(store: MetaStore, current: string): boolean {
  const seen = store.getMeta(LAST_SEEN_KEY);
  if (seen === null) {
    store.setMeta(LAST_SEEN_KEY, current);
    return false;
  }
  return compareVersions(current, seen) === 1;
}

export function markWhatsNewSeen(store: MetaStore, current: string): void {
  store.setMeta(LAST_SEEN_KEY, current);
}
