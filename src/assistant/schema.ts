import type { ObjectSchema, ValueSchema } from './contracts.js'

const TENANT_KEYS = new Set(['workspace', 'workspaceId', 'workspace_id', 'tenant', 'tenantId', 'tenant_id'])
const SENSITIVE_KEY = /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i
const DEFAULT_MAX_DEPTH = 6
const DEFAULT_MAX_BYTES = 64 * 1024
const own = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

export type ValidationResult = { ok: true } | { ok: false; code: string }

export function containsTenantSelector(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsTenantSelector)
  if (!value || typeof value !== 'object') return false

  return Object.entries(value).some(([key, nested]) => TENANT_KEYS.has(key) || containsTenantSelector(nested))
}

export function schemaContainsSensitiveKey(schema: ValueSchema): boolean {
  if (schema.type === 'array') return schemaContainsSensitiveKey(schema.items)
  if (schema.type !== 'object') return false
  return Object.entries(schema.properties).some(([key, nested]) => SENSITIVE_KEY.test(key) || schemaContainsSensitiveKey(nested))
}

function encodedBytes(value: unknown): number | null {
  try {
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
