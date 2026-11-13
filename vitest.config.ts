import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, './src') };
const exclude = [...configDefaults.exclude, 'build/**', '.next/**', 'dist/**', 'out/**', '.worktrees/**'];
const installerTests = 'scripts/installer/**/*.test.ts';

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'app',
          exclude: [...exclude, installerTests],
          server: { deps: { inline: [/@jensbouma123\/acciva-ui/] } },
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'installer',
          include: [installerTests],
          exclude,
          testTimeout: 60_000,
        },
      },
    ],
  },
});
