import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    alias: {
      '@tabby/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
    env: loadEnv('test', process.cwd(), ''),
  },
});
