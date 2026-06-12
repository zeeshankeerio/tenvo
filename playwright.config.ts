import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests — run against a local dev server by default.
 *
 * 1. Install browsers once: `bun run playwright:install`
 * 2. Start app: `bun run dev`
 * 3. Run: `bun run test:e2e`
 *
 * Override base URL: `PLAYWRIGHT_BASE_URL=http://localhost:3001 bun run test:e2e`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
