import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e-preview',
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:3107', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'NEXT_PUBLIC_ENABLE_DEMO_DATA=true NEXT_PUBLIC_ENABLE_INVOICING=false NEXT_PUBLIC_ENABLE_INBOX=false NEXT_PUBLIC_ENABLE_AUTOMATIONS=false npm run dev -- --hostname 127.0.0.1 --port 3107',
    url: 'http://127.0.0.1:3107/login',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
