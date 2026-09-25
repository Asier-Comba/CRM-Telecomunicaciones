import type { ObjectSchema } from './contracts.js'

const TENANT_KEYS = new Set(['workspace', 'workspaceId', 'workspace_id', 'tenant', 'tenantId', 'tenant_id'])

export type ValidationResult = { ok: true } | { ok: false; code: string }

export function containsTenantSelector(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsTenantSelector)
  if (!value || typeof value !== 'object') return false

  return Object.entries(value).some(([key, nested]) => TENANT_KEYS.has(key) || containsTenantSelector(nested))
}

export function validateObject(schema: ObjectSchema, value: unknown): ValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, code: 'expected_object' }

  const record = value as Record<string, unknown>
  const unknownKey = Object.keys(record).find((key) => !(key in schema.properties))
  if (unknownKey) return { ok: false, code: 'unknown_property' }

  const missing = schema.required.find((key) => record[key] === undefined)
  if (missing) return { ok: false, code: 'missing_required_property' }

  for (const [key, candidate] of Object.entries(record)) {
    const property = schema.properties[key]
    if (!property) return { ok: false, code: 'unknown_property' }

    if (property.type === 'string') {
      if (typeof candidate !== 'string') return { ok: false, code: 'invalid_property_type' }
      if (property.minLength !== undefined && candidate.length < property.minLength) return { ok: false, code: 'string_too_short' }
      if (property.maxLength !== undefined && candidate.length > property.maxLength) return { ok: false, code: 'string_too_long' }
      if (property.enum && !property.enum.includes(candidate)) return { ok: false, code: 'invalid_enum_value' }
    }

    if (property.type === 'number') {
      if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return { ok: false, code: 'invalid_property_type' }
      if (property.minimum !== undefined && candidate < property.minimum) return { ok: false, code: 'number_too_small' }
      if (property.maximum !== undefined && candidate > property.maximum) return { ok: false, code: 'number_too_large' }
    }

    if (property.type === 'boolean' && typeof candidate !== 'boolean') {
      return { ok: false, code: 'invalid_property_type' }
    }
  }

  return { ok: true }
}
