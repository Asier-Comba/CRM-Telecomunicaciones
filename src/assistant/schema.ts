import type { ObjectSchema, ValueSchema } from './contracts.ts'

const TENANT_KEYS = new Set(['workspace', 'workspaceid', 'tenant', 'tenantid'])
const SENSITIVE_KEY = /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i
const DEFAULT_MAX_DEPTH = 6
const DEFAULT_MAX_BYTES = 64 * 1024
const own = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)
const HIGH_CONFIDENCE_SECRET = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:authorization|proxy-authorization)\s*(?::|=)?\s*(?:bearer|basic)\s+[A-Za-z0-9+/_=.-]{12,}/i,
  /\bbearer\s+[A-Za-z0-9._~+/-]{16,}={0,2}\b/i,
  /\bbasic\s+(?=[A-Za-z0-9+/=]{16,}\b)(?=[A-Za-z0-9+/=]*[0-9+/=])[A-Za-z0-9+/]{14,}={0,2}\b/i,
  /\b(?:aws_(?:secret_access_key|access_key_id|session_token)|x-api-key|api[ _-]?key|oauth[ _-]?(?:access|refresh)[ _-]?token|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|password|passwd|session[ _-]?(?:id|token))\s*[:=]\s*["']?[A-Za-z0-9+/_=.-]{12,}/i,
  /\b(?:set-cookie|cookie)\s*:\s*[^\s;,=]+=[A-Za-z0-9+/_=.%:-]{12,}/i,
  /\b(?:sk-(?:(?:proj|svcacct)-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/,
]

export type ValidationResult = { ok: true } | { ok: false; code: string }

/** Bound recursion and never invoke accessors/toJSON at an untrusted boundary.
 * Cyclic, exotic and excessively deep input is a blocking signal, not a reason
 * to throw before the runtime can produce a safe denial/audit event.
 */
function scanData(value: unknown, keyMatch: (key: string) => boolean, stringMatch: (value: string) => boolean): boolean {
  const ancestors = new WeakSet<object>()
  let nodes = 0
  const visit = (item: unknown, depth: number): boolean => {
    if (++nodes > 10000 || depth > 32) return true
    if (typeof item === 'string') return stringMatch(item)
    if (item === null || typeof item === 'boolean') return false
    if (typeof item === 'number') return !Number.isFinite(item)
    if (typeof item !== 'object') return true
    if (ancestors.has(item) || Object.getOwnPropertySymbols(item).length) return true
    if (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item))) return true
    ancestors.add(item)
    for (const [key, field] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
      if (Array.isArray(item) && key === 'length') continue
      if (!('value' in field) || !field.enumerable || keyMatch(key) || visit(field.value, depth + 1)) return true
    }
    ancestors.delete(item)
    return false
  }
  try { return visit(value, 0) } catch { return true }
}

export function containsTenantSelector(value: unknown): boolean {
  return scanData(value, key => TENANT_KEYS.has(key.replace(/[_-]/g, '').toLowerCase()), () => false)
}

export function schemaContainsSensitiveKey(schema: ValueSchema): boolean {
  if (schema.type === 'array') return schemaContainsSensitiveKey(schema.items)
  if (schema.type !== 'object') return false
  return Object.entries(schema.properties).some(([key, nested]) => SENSITIVE_KEY.test(key) || schemaContainsSensitiveKey(nested))
}

export function containsHighConfidenceSecret(value: unknown): boolean {
  return scanData(value, () => false, text => HIGH_CONFIDENCE_SECRET.some(pattern => pattern.test(text)))
}

function encodedBytes(value: unknown): number | null {
  try {
    if (scanData(value, () => false, () => false)) return null
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return null
  }
}

function validate(schema: ValueSchema, value: unknown, depth: number, maxDepth: number): ValidationResult {
  if (depth > maxDepth) return { ok: false, code: 'value_too_deep' }

  if (schema.type === 'null') return value === null ? { ok: true } : { ok: false, code: 'invalid_property_type' }
  if (schema.type === 'boolean') return typeof value === 'boolean' ? { ok: true } : { ok: false, code: 'invalid_property_type' }

  if (schema.type === 'string') {
    if (typeof value !== 'string') return { ok: false, code: 'invalid_property_type' }
    if (schema.minLength !== undefined && value.length < schema.minLength) return { ok: false, code: 'string_too_short' }
    if (value.length > schema.maxLength) return { ok: false, code: 'string_too_long' }
    if (schema.enum && !schema.enum.includes(value)) return { ok: false, code: 'invalid_enum_value' }
    return { ok: true }
  }

  if (schema.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, code: 'invalid_property_type' }
    if (schema.minimum !== undefined && value < schema.minimum) return { ok: false, code: 'number_too_small' }
    if (schema.maximum !== undefined && value > schema.maximum) return { ok: false, code: 'number_too_large' }
    return { ok: true }
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) return { ok: false, code: 'invalid_property_type' }
    if (value.length > schema.maxItems) return { ok: false, code: 'array_too_long' }
    for (const item of value) {
      const result = validate(schema.items, item, depth + 1, maxDepth)
      if (!result.ok) return result
    }
    return { ok: true }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, code: 'expected_object' }
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !own(schema.properties, key))) return { ok: false, code: 'unknown_property' }
  if (schema.required.some((key) => record[key] === undefined)) return { ok: false, code: 'missing_required_property' }

  for (const [key, candidate] of Object.entries(record)) {
    if (!own(schema.properties, key)) return { ok: false, code: 'unknown_property' }
    const property = schema.properties[key]
    if (!property) return { ok: false, code: 'unknown_property' }
    const result = validate(property, candidate, depth + 1, maxDepth)
    if (!result.ok) return result
  }
  return { ok: true }
}

export function validateValue(
  schema: ValueSchema,
  value: unknown,
  limits: { maxDepth?: number; maxBytes?: number } = {},
): ValidationResult {
  const bytes = encodedBytes(value)
  if (bytes === null) return { ok: false, code: 'value_not_serializable' }
  if (bytes > (limits.maxBytes ?? DEFAULT_MAX_BYTES)) return { ok: false, code: 'value_too_large' }
  return validate(schema, value, 0, limits.maxDepth ?? DEFAULT_MAX_DEPTH)
}

export function validateObject(schema: ObjectSchema, value: unknown): ValidationResult {
  return validateValue(schema, value)
}
