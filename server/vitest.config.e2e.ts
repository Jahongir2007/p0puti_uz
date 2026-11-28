import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['reflect-metadata'], // decorators need it, as in the real app
    fileParallelism: false, // one app and one test database at a time
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
