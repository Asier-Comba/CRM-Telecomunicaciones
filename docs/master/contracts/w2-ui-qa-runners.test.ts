import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

type RunnerManifest = {
  version: string
  scope: string
  assertions: Array<{ id: string; sourceTest: string; testTitle: string }>
}

const manifest = JSON.parse(
  readFileSync(
    new URL('../fixtures/W2_UI_QA_RUNNERS.json', import.meta.url),
    'utf8',
  ),
) as RunnerManifest

const required = [
  'dialog-tab-loop-and-restore',
  'access-revoked-focus-safe-heading',
  'loading-status-named-by-section',
  'stale-announced-once',
  'pagination-load-more-retains-focus',
  'sensitive-reveal-revoke-scrubs',
  'assistant-stream-does-not-move-focus',
] as const

test('high-risk accessibility assertions have executable contract runners', () => {
  assert.equal(manifest.version, 'w2.ui-qa-runners.v1')
  assert.equal(manifest.scope, 'transport-neutral-contract-evidence')
  assert.deepEqual(
    manifest.assertions.map(({ id }) => id),
    required,
  )
})

test('runner registry has no orphan assertion or duplicate test binding', () => {
  const ids = manifest.assertions.map(({ id }) => id)
  const bindings = manifest.assertions.map(
    ({ sourceTest, testTitle }) => `${sourceTest}#${testTitle}`,
  )
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(bindings).size, bindings.length)

  for (const runner of manifest.assertions) {
    const sourceUrl = new URL(`../../../${runner.sourceTest}`, import.meta.url)
    const source = readFileSync(sourceUrl, 'utf8')
    assert.ok(
      source.includes(`test('${runner.testTitle}'`),
      `${runner.id} has no executable named test`,
    )
  }
})
