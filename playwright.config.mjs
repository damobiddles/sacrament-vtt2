// Browser tests: Playwright opens a real Chromium browser, starts the Sacrament RPG Table on this computer, and uses it like a person would.
// Run: npm run test:e2e        (against the deployed site instead: VTT_BASE=https://playsacrament.com npm run test:e2e)
import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const live = (process.env.VTT_BASE || '').replace(/\/$/, '');
const port = 8799;
const chromium = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: live || `http://localhost:${port}`,
    viewport: { width: 1366, height: 800 },
    launchOptions: { executablePath: chromium, proxy: live && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined },
    trace: 'off',
    // Nothing may wait forever: by default Playwright waits without limit for a page to load or a click to land.
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  webServer: live ? undefined : { command: `node scripts/build-blog.mjs && node scripts/build-landing.mjs && node scripts/vtt/server.mjs ${port} .vtt-data-e2e`, url: `http://localhost:${port}/vtt/`, reuseExistingServer: false, timeout: 20000 },
});
