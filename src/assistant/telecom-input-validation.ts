import { telecomCapability } from './telecom-catalog.js'
import { containsHighConfidenceSecret, type ValidationResult } from './schema.js'

/** Calendar validation, not Date.parse rollover. Relative dates are planner context work. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return day <= ([31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0)
}

/** Fail closed before any adapter: inputs are flat, closed JSON objects. */
export function validateTelecomInput(name: string, input: unknown): ValidationResult {
  const capability = telecomCapability(name)
  const fail = (code: string): ValidationResult => ({ ok: false, code })
  if (!capability) return fail('unknown_capability')
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('expected_object')
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) return fail('invalid_object')
  const fields = Object.getOwnPropertyDescriptors(input)
  if (Reflect.ownKeys(input).length > 16 || Object.values(fields).some((field) => !('value' in field) || !field.enumerable) || Object.getOwnPropertySymbols(input).length) return fail('invalid_object')
  const schema = capability.inputSchema
  if (Object.keys(fields).some((key) => !Object.hasOwn(schema.properties, key))) return fail('unknown_property')
  if (schema.required.some((key) => !Object.hasOwn(fields, key))) return fail('missing_required_property')
  for (const [key, field] of Object.entries(fields)) {
    const rule = schema.properties[key]!
    const value: unknown = field.value
    if (rule.type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < rule.minimum || value > rule.maximum) return fail('invalid_integer')
      continue
    }
    if (value === null && rule.nullable) continue
    if (typeof value !== 'string' || value.length < rule.minLength || value.length > rule.maxLength || !value.trim()) return fail('invalid_string')
    if (rule.enum && !rule.enum.includes(value)) return fail('invalid_enum')
    if (rule.format === 'date' && !isCalendarDate(value)) return fail('invalid_date')
    if (containsHighConfidenceSecret(value)) return fail('secret_value')
  }
  const record = input as Record<string, unknown>
  for (const [from, to] of [['from', 'to'], ['commitment_from', 'commitment_to']] as const) {
    if (typeof record[from] === 'string' && typeof record[to] === 'string' && record[from] > record[to]) return fail('reversed_date_range')
  }
  return { ok: true }
}
