import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installFakeFolderServer } from './test-support/fakeFolderServer';

beforeEach(installFakeFolderServer);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
