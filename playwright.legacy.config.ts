// LEGACY P70 — no forma parte del gate canónico Telecom.
//
// Autenticación: proyecto `setup` hace login REAL por la UI con las credenciales QA de `.auth/`
// (generadas por scripts/p70-create-qa-session.mjs) y guarda el storage state; los demás proyectos lo
// consumen. workers=1 SIEMPRE: el chat comparte estado por workspace (pending actions, rate limit
// 10 msg/min) y los tests son secuenciales por diseño.

import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL

if (!BASE_URL) {
  throw new Error('E2E_BASE_URL explícita requerida para los E2E legacy')
}
if (/crm-inmobiliario|hvdnby\.easypanel\.host/i.test(BASE_URL)) {
  throw new Error('El staging inmobiliario es read-only y está prohibido como target E2E')
}

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/qa-storage-state.json' },
      dependencies: ['setup'],
      testIgnore: /mobile/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], storageState: '.auth/qa-storage-state.json' },
      dependencies: ['setup'],
      testMatch: /mobile/,
    },
  ],
})
