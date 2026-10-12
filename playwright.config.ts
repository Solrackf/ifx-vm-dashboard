import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const apiPort = 4179;
const webPort = 5180;
const baseURL = `http://localhost:${webPort}`;
const e2eDatabasePath = path.join(os.tmpdir(), 'ifx-vm-dashboard-playwright.sqlite');
const localEdge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync(localEdge) ? localEdge : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: browserExecutable ? { executablePath: browserExecutable } : {},
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'npm run dev:api',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(apiPort),
        JWT_SECRET: 'playwright-local-test-secret-with-sufficient-length',
        COOKIE_SECURE: 'false',
        WEB_ORIGIN: baseURL,
        DATABASE_PATH: e2eDatabasePath,
      },
    },
    {
      command: `npm --workspace @vm-dashboard/web run dev -- --host 127.0.0.1 --port ${webPort}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
    },
  ],
});
