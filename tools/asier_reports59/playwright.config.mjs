import { defineConfig } from '@playwright/test'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
const attempt = process.env.ASIER59_ATTEMPT
if (!/^attempt\d{2}$/.test(attempt ?? '')) throw Error('NEW_ASIER59_ATTEMPT_REQUIRED')
const folder = resolve(process.env.ASIER59_OUTPUT_ROOT ?? resolve(import.meta.dirname, '../../../../outputs/Integration-2026-10-26/unit59'), attempt)
// Playwright reloads the config inside each worker after creating outputDir.
if (process.env.TEST_WORKER_INDEX === undefined && existsSync(folder)) throw Error('ATTEMPT_ALREADY_EXISTS_PRESERVE_EVIDENCE')
export default defineConfig({ testDir: import.meta.dirname, testMatch: 'reports-initial.spec.mjs',
  workers: 1, fullyParallel: false, retries: 0, timeout: 45000, expect: { timeout: 5000 },
  outputDir: resolve(folder, 'browser'), reporter: [['line'], ['json', { outputFile: resolve(folder, 'results.json') }]],
  use: { browserName: 'chromium', timezoneId: 'Europe/Madrid', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
})
