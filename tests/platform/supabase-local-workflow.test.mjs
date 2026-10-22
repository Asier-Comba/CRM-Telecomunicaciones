import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

const job = yaml.load(readFileSync(new URL('../../.github/workflows/supabase-local.yml', import.meta.url), 'utf8')).jobs['local-platform']
const names = job.steps.map(step => step.name ?? '')
const at = name => names.indexOf(name)

test('job budget is unchanged: the fix is bounded preparation, not a larger timeout', () => {
  assert.equal(job['timeout-minutes'], 35)
})
test('OS packages come from a pinned first-party cache and preparation has its own bound', () => {
  const restore = job.steps[at('Restore cached OS packages (Chromium dependencies, PDF renderer)')]
  const install = job.steps[at('Install Chromium and PDF renderer for actual product UI journeys')]
  const save = job.steps[at('Save OS packages for the next run')]
  for (const step of [restore, save]) assert.match(step.uses, /^actions\/cache\/(restore|save)@[0-9a-f]{40}$/)
  assert.equal(restore.with.key, save.with.key)
  assert.equal(save.if, "steps.os-debs.outputs.cache-hit != 'true'")
  assert.ok(install['timeout-minutes'] > 0 && install['timeout-minutes'] <= 6)
  assert.ok(install.run.includes('npx playwright install --with-deps chromium') && install.run.includes('sudo apt-get install -y poppler-utils'))
  assert.ok(install.run.includes('Acquire::http::Timeout') && install.run.includes('Dir::Cache::Archives'))
  assert.equal((install.run.match(/apt-get update/g) ?? []).length, 0, 'install-deps already refreshed the indexes')
  assert.ok(at('Restore cached OS packages (Chromium dependencies, PDF renderer)') < at('Install Chromium and PDF renderer for actual product UI journeys'))
  assert.ok(at('Save OS packages for the next run') < at('Disposable real-local stack and acceptance'))
})
test('acceptance coverage and evidence retention are unchanged', () => {
  const acceptance = job.steps[at('Disposable real-local stack and acceptance')]
  assert.equal(acceptance.run, 'node --experimental-transform-types scripts/security/supabase-local/run-stack.mjs')
  assert.equal(acceptance.env.W2_PRODUCT_UI, 'true')
  assert.equal(acceptance['timeout-minutes'], undefined)
  for (const name of ['Retain safe summary only', 'Retain synthetic product UI screenshots', 'Retain synthetic history UI screenshots']) assert.equal(job.steps[at(name)].if, 'always()')
})
