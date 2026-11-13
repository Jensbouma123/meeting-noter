import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'build/**', '.next/**', 'dist/**', 'out/**', '.worktrees/**'],
    server: { deps: { inline: [/@jensbouma123\/acciva-ui/] } },
  },
});
