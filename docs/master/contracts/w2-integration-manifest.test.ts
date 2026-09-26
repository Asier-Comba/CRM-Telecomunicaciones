import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

type Unit = {
  id: string
  source: string
  category: string
  targetHint: string
  dependencies: string[]
}
type Manifest = {
  version: string
  sourceBranch: string
  transportPolicy: string
  units: Unit[]
  slices: Array<{ id: string; unitIds: string[] }>
}

const path = new URL(
  '../fixtures/W2_FRONTEND_INTEGRATION_MANIFEST.json',
  import.meta.url,
)
const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest

test('integration manifest has one closed selective transport policy', () => {
  assert.equal(manifest.version, 'w2.integration-manifest.v1')
  assert.equal(manifest.sourceBranch, 'w2/frontend-bootstrap-readiness')
  assert.equal(
    manifest.transportPolicy,
    'selective_copy_from_accepted_sha_only',
  )
})

test('every transport unit is unique, exists and targets feature architecture', () => {
  const ids = manifest.units.map(({ id }) => id)
  const sources = manifest.units.map(({ source }) => source)
  const targets = manifest.units.map(({ targetHint }) => targetHint)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(sources).size, sources.length)
  assert.equal(new Set(targets).size, targets.length)

  const allowedCategories = new Set([
    'boundary',
    'presentation',
    'security',
    'accessibility',
    'feature',
  ])
  for (const unit of manifest.units) {
    assert.equal(existsSync(new URL(`../../../${unit.source}`, import.meta.url)), true)
    assert.equal(allowedCategories.has(unit.category), true)
    assert.match(unit.targetHint, /^src\/features\/[a-z0-9-]+\/[a-z0-9-]+\.ts$/)
    assert.equal(unit.source.includes('src/app'), false)
  }
})

test('dependency graph is closed and acyclic', () => {
  const units = new Map(manifest.units.map((unit) => [unit.id, unit]))
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const visit = (id: string): void => {
    assert.equal(visiting.has(id), false, `cycle at ${id}`)
    if (visited.has(id)) return
    const unit = units.get(id)
    assert.ok(unit, `missing unit ${id}`)
    visiting.add(id)
    for (const dependency of unit.dependencies) visit(dependency)
    visiting.delete(id)
    visited.add(id)
  }

  for (const id of units.keys()) visit(id)
})

test('every integration slice references known units without duplication', () => {
  const unitIds = new Set(manifest.units.map(({ id }) => id))
  assert.equal(new Set(manifest.slices.map(({ id }) => id)).size, manifest.slices.length)
  for (const slice of manifest.slices) {
    assert.ok(slice.unitIds.length > 0)
    assert.equal(new Set(slice.unitIds).size, slice.unitIds.length)
    assert.equal(slice.unitIds.every((id) => unitIds.has(id)), true)
  }
})

test('required first slices remain explicit and ordered', () => {
  assert.deepEqual(
    manifest.slices.slice(0, 4).map(({ id }) => id),
    [
      'primitives-accessibility',
      'tenant-shell',
      'customer-360-identity-attention',
      'assistant-read',
    ],
  )
})
