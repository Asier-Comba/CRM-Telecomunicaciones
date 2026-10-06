import assert from 'node:assert/strict'
import test from 'node:test'
import { ENTITY_KINDS_V1, ENTITY_KINDS_V1_SOURCE, isEntityKindV1 } from '../../src/assistant/entity-kinds.ts'

test('entity taxonomy is the exact 18-kind pinned W1 telecom.v1 contract', () => {
  assert.deepEqual(ENTITY_KINDS_V1, [
    'user', 'customer', 'contact', 'operator', 'plan',
    'contract', 'service', 'line', 'commitment',
    'permanence', 'renewal', 'opportunity',
    'opportunity_stage', 'task', 'meeting', 'activity',
    'document', 'incident',
  ])
  assert.equal(new Set(ENTITY_KINDS_V1).size, 18)
  assert.equal(Object.isFrozen(ENTITY_KINDS_V1), true)
  assert.equal(ENTITY_KINDS_V1_SOURCE.commit, 'e65f1e802fbcb63f9a1636689b85eb2aa135c592')
  assert.equal(ENTITY_KINDS_V1_SOURCE.path, 'src/lib/contracts/telecom-v1.ts')
  assert.equal(ENTITY_KINDS_V1_SOURCE.contractVersion, 'telecom.v1')
  for (const kind of ENTITY_KINDS_V1) assert.equal(isEntityKindV1(kind), true)
})

test('kind guard rejects invented kinds, legacy aliases, prototype keys and non-strings', () => {
  for (const value of ['invoice', 'workspace', 'tenant', 'company', 'calendar', 'service_line', 'opportunityStage', 'Customer', ' customer', 'customer ', '__proto__', 'constructor', 'toString', '', null, undefined, 1, {}, ['customer'], new String('customer')]) {
    assert.equal(isEntityKindV1(value), false)
  }
})
