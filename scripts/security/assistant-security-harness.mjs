import { readFile } from 'node:fs/promises'

const SAFE_ERROR = /^[a-z][a-z0-9_]{0,63}$/
const VALID_STATUS = new Set(['denied', 'completed', 'failed', 'reconciliation_required'])
const REQUIRED_CATEGORIES = new Set([
  'confirmation', 'tenant', 'concurrency', 'replay',
  'recovery', 'outage', 'output', 'tool',
])

export async function loadAssistantSecurityCases(
  path = '.security/assistant-security-cases.json',
) {
  return JSON.parse(await readFile(path, 'utf8'))
}

export function validateAssistantSecurityCases(matrix) {
  if (!matrix || matrix.version !== 1 || !Array.isArray(matrix.cases)) {
    throw new Error('assistant matrix must use version 1 with cases')
  }
  if (!Number.isInteger(matrix.requiredParallelism) || matrix.requiredParallelism < 20) {
    throw new Error('assistant matrix must require at least 20-way races')
  }

  const ids = new Set()
  const categories = new Set()
  for (const item of matrix.cases) {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(item.id)) {
      throw new Error('assistant case has invalid id')
    }
    if (ids.has(item.id)) throw new Error(`duplicate assistant case: ${item.id}`)
    ids.add(item.id)
    categories.add(item.category)
    if (!VALID_STATUS.has(item.expectedStatus)) {
      throw new Error(`invalid expected status: ${item.id}`)
    }
    if (!Number.isInteger(item.maxEffects) || item.maxEffects < 0 || item.maxEffects > 1) {
      throw new Error(`invalid maxEffects: ${item.id}`)
    }
    if (item.parallelism !== undefined && item.parallelism !== matrix.requiredParallelism) {
      throw new Error(`race parallelism mismatch: ${item.id}`)
    }
  }

  for (const category of REQUIRED_CATEGORIES) {
    if (!categories.has(category)) throw new Error(`missing category: ${category}`)
  }
  if (![...ids].some((id) => id.includes('restart'))) {
    throw new Error('restart/reconciliation evidence is required')
  }
  return matrix
}

function assertResult(item, result) {
  if (!result || result.status !== item.expectedStatus) {
    throw new Error(`${item.id}: expected status ${item.expectedStatus}`)
  }
  if (!Number.isInteger(result.effectCount) || result.effectCount > item.maxEffects) {
    throw new Error(`${item.id}: effect count exceeds ${item.maxEffects}`)
  }
  if (result.crossWorkspaceAccess !== false) {
    throw new Error(`${item.id}: cross-workspace access was not disproven`)
  }
  if (item.requireBoundedError && !SAFE_ERROR.test(result.errorCode ?? '')) {
    throw new Error(`${item.id}: error is not bounded`)
  }
  if (item.requireSecretFreeOutput && result.secretValueDetected !== false) {
    throw new Error(`${item.id}: secret-bearing output was not rejected`)
  }
  if (item.forbidArbitraryTarget && result.arbitraryTargetUsed !== false) {
    throw new Error(`${item.id}: arbitrary target was reached`)
  }
  if (item.forbidAutomaticRetry && result.automaticRetry !== false) {
    throw new Error(`${item.id}: effect may be retried automatically`)
  }
}

export async function runAssistantSecurityMatrix(adapter, matrix) {
  validateAssistantSecurityCases(matrix)
  const results = []
  for (const item of matrix.cases) {
    const result = await adapter.run(item)
    assertResult(item, result)
    results.push({ id: item.id, passed: true })
  }
  return results
}
