import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

type Surface = {
  requiredScenarios: string[]
  keyboardPaths: string[]
  screenReaderAssertions: string[]
}

type QaMatrix = {
  syntheticOnly: boolean
  viewports: Array<{ width: number; mode: string }>
  surfaces: Record<string, Surface>
  commonAssertions: string[]
  visualReview: {
    evidence: {
      screenshotsUseSyntheticFixturesOnly: boolean
      sensitiveFailureScreenshots: string
      requiredInputModes: string[]
    }
  }
}

const matrixUrl = new URL('../fixtures/W2_UI_QA_MATRIX.json', import.meta.url)
const matrix = JSON.parse(await readFile(matrixUrl, 'utf8')) as QaMatrix

const coreStates = [
  'normal',
  'empty',
  'partial',
  'loading',
  'error',
  'forbidden_safe',
  'stale',
  'long_text',
  'large_account',
  'no_contracts',
  'multiple_renewals',
]

test('required responsive widths are unique and complete', () => {
  const widths = matrix.viewports.map(({ width }) => width)
  assert.deepEqual(widths, [320, 375, 768, 1024, 1440])
  assert.equal(new Set(widths).size, widths.length)
})

test('Customer 360 and Dashboard cover the full state/account matrix', () => {
  for (const surfaceName of ['customer360', 'dashboard']) {
    const scenarios = matrix.surfaces[surfaceName].requiredScenarios
    assert.deepEqual(scenarios, coreStates, surfaceName)
    assert.equal(new Set(scenarios).size, scenarios.length, surfaceName)
  }
})

test('assistant READ covers interruption and stale continuation safely', () => {
  const scenarios = matrix.surfaces.assistantRead.requiredScenarios
  for (const required of [
    'read_success',
    'partial',
    'unknown_descriptor_rejected',
    'forbidden_safe_notice',
    'stream_interruption',
    'stale_continuation',
    'invalid_envelope',
  ]) {
    assert.ok(scenarios.includes(required), required)
  }
})

test('every surface defines keyboard and screen-reader evidence', () => {
  for (const [name, surface] of Object.entries(matrix.surfaces)) {
    assert.ok(surface.keyboardPaths.length >= 4, name)
    assert.ok(surface.screenReaderAssertions.length >= 6, name)
  }
})

test('security-sensitive visual evidence remains synthetic and fail closed', () => {
  assert.equal(matrix.syntheticOnly, true)
  assert.equal(
    matrix.visualReview.evidence.screenshotsUseSyntheticFixturesOnly,
    true,
  )
  assert.equal(
    matrix.visualReview.evidence.sensitiveFailureScreenshots,
    'disabled-until-automatic-redaction-is-proven',
  )
  assert.ok(
    matrix.commonAssertions.includes(
      'masked-sensitive-fields-never-appear-in-client-logs',
    ),
  )
})

test('keyboard, touch and pointer input evidence are required', () => {
  assert.deepEqual(matrix.visualReview.evidence.requiredInputModes, [
    'keyboard',
    'touch',
    'pointer',
  ])
})
