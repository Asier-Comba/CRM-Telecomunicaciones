import assert from 'node:assert/strict'

import {
  loadAssistantSecurityCases,
  runAssistantSecurityMatrix,
  validateAssistantSecurityCases,
} from '../security/assistant-security-harness.mjs'

const matrix = await loadAssistantSecurityCases()
validateAssistantSecurityCases(matrix)

const secureResult = (item) => ({
  status: item.expectedStatus,
  effectCount: item.maxEffects,
  crossWorkspaceAccess: false,
  errorCode: item.requireBoundedError ? 'operation_denied' : undefined,
  secretValueDetected: false,
  arbitraryTargetUsed: false,
  automaticRetry: false,
})

const passed = await runAssistantSecurityMatrix(
  { run: async (item) => secureResult(item) },
  matrix,
)
assert.equal(passed.length, matrix.cases.length)

const mutations = [
  ['duplicate effect', 'race-confirm-20', { effectCount: 2 }],
  ['replay effect', 'replay-completed', { effectCount: 1 }],
  ['restart retry', 'restart-after-effect-before-complete', { automaticRetry: true }],
  ['cross-workspace', 'confirmation-cross-workspace', { crossWorkspaceAccess: true }],
  ['secret output', 'output-bearer-value', { secretValueDetected: true }],
  ['arbitrary URL', 'tool-arbitrary-url', { arbitraryTargetUsed: true }],
  ['unbounded error', 'confirmation-forged', { errorCode: 'raw error containing identifiers' }],
  ['outage effect', 'idempotency-store-unavailable', { effectCount: 1 }],
]

for (const [name, target, mutation] of mutations) {
  await assert.rejects(
    runAssistantSecurityMatrix(
      {
        run: async (item) =>
          item.id === target
            ? { ...secureResult(item), ...mutation }
            : secureResult(item),
      },
      matrix,
    ),
    undefined,
    `${name} negative control must fail`,
  )
}

console.log(
  `Assistant security harness passed (${matrix.cases.length} cases; ${mutations.length} negative controls detected)`,
)
