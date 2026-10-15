import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: ['tests/unit/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
});
