import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };
const exclude = [...configDefaults.exclude, 'build/**', '.next/**', 'dist/**', 'out/**', '.worktrees/**'];
// Cap parallelism: the default (cpus-1) starves tests of CPU when the host is busy.
const maxWorkers = Number(process.env.VITEST_MAX_WORKERS) || '50%';
const installerTests = 'scripts/installer/**/*.test.ts';

export default defineConfig({
  resolve: { alias },
  test: {
    maxWorkers,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'app',
          testTimeout: 20_000,
          hookTimeout: 20_000,
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
