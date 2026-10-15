import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests drive real Chrome with the unpacked build from `dist/`
 * (see `tests/e2e/fixtures.ts`). They are the release gate for extension
 * behaviour that cannot be observed in happy-dom.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'off' },
});
