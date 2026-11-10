import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * There was no vitest config at all before this: every existing test file
 * imported its subject via a relative path, so nothing had ever exercised
 * the `@/*` -> `src/*` alias `tsconfig.json` defines for the Next.js build.
 * `src/lib/meeting/index.ts` (and anything that imports it) does use `@/`
 * imports, and fails to resolve under plain `vitest run` without this.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
