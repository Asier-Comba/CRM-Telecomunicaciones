import assert from 'node:assert/strict'
import test from 'node:test'
import { TELECOM_INPUT_EVAL_CASES } from '../../src/assistant/telecom-eval-cases.ts'
import { TELECOM_CAPABILITY_CATALOG } from '../../src/assistant/telecom-catalog.ts'
import { validateTelecomInput } from '../../src/assistant/telecom-input-validation.ts'

test('structured telecom eval fixtures have unique IDs, useful volume and all 14 accepted operations', () => {
  assert.ok(TELECOM_INPUT_EVAL_CASES.length >= 60)
  assert.equal(new Set(TELECOM_INPUT_EVAL_CASES.map(c => c.id)).size, TELECOM_INPUT_EVAL_CASES.length)
  const accepted = TELECOM_INPUT_EVAL_CASES.filter(c => c.expected.ok)
  assert.deepEqual([...new Set(accepted.map(c => c.capability))].sort(), TELECOM_CAPABILITY_CATALOG.map(c => c.name).sort())
  assert.ok(accepted.length >= 25)
  assert.ok(TELECOM_INPUT_EVAL_CASES.filter(c => !c.expected.ok).length >= 30)
  for (const fixture of TELECOM_INPUT_EVAL_CASES) assert.ok(fixture.prompt.length >= 15)
})

for (const fixture of TELECOM_INPUT_EVAL_CASES) {
  test(`structured input only: ${fixture.id}`, () => {
    assert.deepEqual(validateTelecomInput(fixture.capability, fixture.input), fixture.expected, fixture.prompt)
  })
}
