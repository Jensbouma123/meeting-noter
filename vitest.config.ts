import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

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
  test: {
    // build/, .next/, dist/ and out/ hold stale compiled copies of test files;
    // .worktrees/ holds other branches' checkouts, gated on their own.
    exclude: [...configDefaults.exclude, 'build/**', '.next/**', 'dist/**', 'out/**', '.worktrees/**'],
    // acciva-ui is installed as a copy (install-links), so vitest would load it
    // through Node ESM, which cannot resolve its extensionless `next/link`.
    server: { deps: { inline: [/@jensbouma123\/acciva-ui/] } },
  },
});
