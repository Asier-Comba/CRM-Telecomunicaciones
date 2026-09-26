import assert from 'node:assert/strict'
import test from 'node:test'

import {
  W2_TOKEN_NAMES,
  isUiTokenRegistry,
  type UiTokenRegistry,
} from './w2-ui-foundation.ts'

test('semantic token names are unique and business-domain neutral', () => {
  assert.equal(new Set(W2_TOKEN_NAMES).size, W2_TOKEN_NAMES.length)

  for (const token of W2_TOKEN_NAMES) {
    assert.doesNotMatch(
      token,
      /customer|contract|renewal|permanence|opportunity|invoice/i,
    )
  }
})

test('semantic token contract covers every required foundation family', () => {
  const families = new Set(W2_TOKEN_NAMES.map((token) => token.split('.')[0]))
  assert.deepEqual([...families].sort(), [
    'action',
    'border',
    'elevation',
    'focus',
    'motion',
    'shape',
    'spacing',
    'status',
    'surface',
    'text',
  ])
})

test('token registry accepts one non-empty value for every exact semantic key', () => {
  const registry = Object.fromEntries(
    W2_TOKEN_NAMES.map((token) => [token, `var(--w2-${token.replace('.', '-')})`]),
  ) as UiTokenRegistry

  assert.equal(isUiTokenRegistry(registry), true)
})

test('token registry rejects missing, extra, empty and URL-bearing values', () => {
  const valid = Object.fromEntries(
    W2_TOKEN_NAMES.map((token) => [token, `var(--w2-${token.replace('.', '-')})`]),
  )

  const missing = { ...valid }
  delete missing['focus.ring']
  assert.equal(isUiTokenRegistry(missing), false)

  assert.equal(isUiTokenRegistry({ ...valid, 'customer.risk': 'red' }), false)
  assert.equal(isUiTokenRegistry({ ...valid, 'focus.ring': ' ' }), false)
  assert.equal(
    isUiTokenRegistry({ ...valid, 'surface.canvas': 'url(https://example.test)' }),
    false,
  )
})
