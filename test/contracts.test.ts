import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { EVAL_CATEGORIES, validateEvalCase } from '../src/assistant/eval-schema.js'
import { validateAssistantResponse } from '../src/assistant/ui-contract.js'

test('UI contract accepts bounded structured data', () => {
  const response = validateAssistantResponse({
    answer: 'He encontrado un cliente.',
    status: 'SUCCESS',
    grounded: true,
    blocks: {
      entities: [{ entityType: 'customer', entityId: 'customer-1', label: 'ACME' }],
      table: {
        columns: [{ key: 'name', label: 'Cliente', format: 'text' }],
        rows: [{ name: 'ACME' }],
        truncated: false,
      },
    },
    meta: { requestId: 'req-1', capability: 'crm.customer.search', partial: false },
  })

  assert.ok(response)
})

test('UI contract rejects secret-bearing payload keys', () => {
  const response = validateAssistantResponse({
    answer: 'Resultado',
    status: 'SUCCESS',
    grounded: true,
    blocks: { navigation: { module: 'customers' } },
    meta: { requestId: 'req-1', partial: false, accessToken: 'forbidden' },
  })

  assert.equal(response, null)
})

test('eval catalog is valid and covers every required category', async () => {
  const text = await readFile('evals/assistant/catalog.v1.jsonl', 'utf8')
  const cases = text.trim().split('\n').map((line) => JSON.parse(line) as unknown)

  assert.ok(cases.every(validateEvalCase))
  const categories = new Set(cases.map((candidate) => {
    if (!validateEvalCase(candidate)) throw new Error('invalid eval case')
    return candidate.category
  }))
  assert.deepEqual([...EVAL_CATEGORIES].sort(), [...categories].sort())
})
