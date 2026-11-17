import { afterEach, beforeEach, vi } from 'vitest';
import { installMemoryStorage } from './session-store.testUtils';

export function registerMemoryStore(): void {
  beforeEach(installMemoryStorage);
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
