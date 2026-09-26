import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

type FixtureCase = {
  id: string
  expected: string
  response: Record<string, unknown>
}

type StreamEvent = Record<string, unknown> & {
  contractVersion: number
  sequence: number
  type: string
}

type StreamCase = {
  id: string
  expected: string
  events: StreamEvent[]
}

type FixtureManifest = {
  contractVersion: number
  w3ReviewedCommit: string
  mutationFixturesExcluded: boolean
  taxonomy: { version: string }
  cases: FixtureCase[]
  streamCases: StreamCase[]
  clientStateCases: Array<{ id: string; expected: string }>
}

const fixtureUrl = new URL(
  '../fixtures/W2_ASSISTANT_READ_UI_FIXTURES.json',
  import.meta.url,
)
const manifest = JSON.parse(
  await readFile(fixtureUrl, 'utf8'),
) as FixtureManifest

const decisionById = new Map(
  manifest.cases.map(({ id, expected }) => [id, expected]),
)

test('fixture manifest tracks the stable W3 READ v1 review', () => {
  assert.equal(manifest.contractVersion, 1)
  assert.equal(manifest.w3ReviewedCommit, '874259e')
  assert.equal(manifest.mutationFixturesExcluded, true)
  assert.equal(manifest.cases.length, 9)
})

test('the nine W3 decisions remain exact', () => {
  assert.deepEqual(Object.fromEntries(decisionById), {
    'success-answer-only': 'accept',
    'empty-with-refinement': 'accept',
    'partial-table-with-continuation': 'accept',
    'unknown-entity-rejected-by-taxonomy': 'reject',
    'forbidden-safe-notice': 'accept',
    'ungrounded-evidence-rejected': 'reject',
    'executable-follow-up-rejected': 'reject',
    'secret-like-key-rejected': 'reject',
    'invalid-envelope-rejected': 'reject',
  })
})

test('accepted envelopes include version and matching taxonomy metadata', () => {
  for (const fixture of manifest.cases.filter(
    ({ expected }) => expected === 'accept',
  )) {
    assert.equal(fixture.response.contractVersion, 1, fixture.id)
    const meta = fixture.response.meta as Record<string, unknown>
    assert.equal(meta.taxonomyVersion, manifest.taxonomy.version, fixture.id)
  }
})

test('accepted truncated tables always carry continuation metadata', () => {
  for (const fixture of manifest.cases.filter(
    ({ expected }) => expected === 'accept',
  )) {
    const blocks = fixture.response.blocks as Record<string, unknown>
    const table = blocks.table as Record<string, unknown> | undefined
    if (table?.truncated === true) {
      assert.equal(typeof table.continuation, 'object', fixture.id)
    }
  }
})

test('accepted follow-ups are prompt-only suggestion or refine controls', () => {
  for (const fixture of manifest.cases.filter(
    ({ expected }) => expected === 'accept',
  )) {
    const blocks = fixture.response.blocks as Record<string, unknown>
    const followUps = blocks.followUps as
      | Array<Record<string, unknown>>
      | undefined
    for (const followUp of followUps ?? []) {
      assert.ok(
        followUp.kind === 'suggestion' || followUp.kind === 'refine',
        fixture.id,
      )
    }
  }
})

test('stream fixtures preserve order and keep deltas text-only', () => {
  for (const fixture of manifest.streamCases) {
    fixture.events.forEach((event, index) => {
      assert.equal(event.contractVersion, 1, fixture.id)
      assert.equal(event.sequence, index, fixture.id)

      if (event.type === 'answer_delta' && fixture.expected !== 'reject') {
        assert.deepEqual(Object.keys(event).sort(), [
          'contractVersion',
          'sequence',
          'text',
          'type',
        ])
      }
    })
  }
})

test('stale continuation is fail closed after taxonomy change', () => {
  assert.deepEqual(manifest.clientStateCases, [
    {
      id: 'stale-continuation-after-taxonomy-change',
      given: {
        cursor: 'opaque-page-2',
        validatedTaxonomyVersion: 'w1-pending-v0',
        currentTaxonomyVersion: 'w1-accepted-v1',
      },
      expected: 'disable-continuation-and-request-fresh-read',
      assertions: [
        'the browser does not rewrite or replay the stale cursor automatically',
        'the cursor is never treated as authorization',
        'no existing structured block becomes interactive under the new taxonomy',
      ],
    },
  ])
})
