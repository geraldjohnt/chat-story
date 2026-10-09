import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * E2E tests run against real production builds served under the GitHub Pages base path:
 *  - dist-e2e: production build + development fixtures (renderer/dashboard/export coverage)
 *  - dist: the actual production artifact (empty library, no fixtures)
 * The environment's preinstalled Chromium is used when present.
 */
const preinstalled = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const launchOptions = preinstalled && !process.env.CI ? { executablePath: preinstalled } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure', acceptDownloads: true, launchOptions },
  webServer: [
    { command: 'npx vite preview --outDir dist-e2e --base /chat-story/ --port 4174 --strictPort', url: 'http://localhost:4174/chat-story/', reuseExistingServer: !process.env.CI },
    { command: 'npx vite preview --outDir dist --base /chat-story/ --port 4175 --strictPort', url: 'http://localhost:4175/chat-story/', reuseExistingServer: !process.env.CI },
  ],
  projects: [
    { name: 'fixtures-desktop', testMatch: /fixtures\..*\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4174/chat-story/' } },
    { name: 'fixtures-mobile', testMatch: /mobile\..*\.spec\.ts/, use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4174/chat-story/' } },
    { name: 'production', testMatch: /production\..*\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4175/chat-story/' } },
  ],
});
