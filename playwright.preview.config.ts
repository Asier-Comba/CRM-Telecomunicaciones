import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e-preview',
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3107', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run preview:dev',
    url: 'http://127.0.0.1:3107/login',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
