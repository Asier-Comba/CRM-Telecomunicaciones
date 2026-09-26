export type RuntimeRejectCode =
  | 'expected_object'
  | 'unknown_field'
  | 'missing_field'
  | 'wrong_type'
  | 'unknown_enum'
  | 'invalid_identifier'
  | 'invalid_date'
  | 'invalid_datetime'
  | 'invalid_value'
  | 'limit_exceeded'

export type RuntimeReject = {
  code: RuntimeRejectCode
  /** Structural path only. It must never contain a runtime value. */
  path: string
}

export type RuntimeParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RuntimeReject }

export const accept = <T>(value: T): RuntimeParseResult<T> => ({
  ok: true,
  value,
})

export const reject = <T = never>(
  code: RuntimeRejectCode,
  path: string,
): RuntimeParseResult<T> => ({ ok: false, error: { code, path } })

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const hasExactKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean => {
  const keys = Object.keys(value)
  return (
    keys.length === allowed.length &&
    keys.every((key) => allowed.includes(key))
  )
}

export const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean => Object.keys(value).every((key) => allowed.includes(key))

export const isBoundedString = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is string =>
  typeof value === 'string' &&
  value.length >= minimum &&
  value.length <= maximum

export const SAFE_OPAQUE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,255}$/

export const isSafeOpaqueReference = (value: unknown): value is string =>
  typeof value === 'string' && SAFE_OPAQUE_REFERENCE.test(value)

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export const isStrictIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  )
}

/** W1 v0 timestamps are UTC and therefore require a literal trailing `Z`. */
export const isStrictIsoUtcDateTime = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(
      value,
    )
  if (!match || !isStrictIsoDate(match[1])) return false

  const hour = Number(match[2])
  const minute = Number(match[3])
  const second = Number(match[4])

  return hour <= 23 && minute <= 59 && second <= 59
}

const encodedByteLength = (value: unknown): number | null => {
  try {
    const encoded = JSON.stringify(value)
    return encoded === undefined ? null : new TextEncoder().encode(encoded).length
  } catch {
    return null
  }
}

/**
 * All externally sourced parsers enter here. Getter/proxy/toJSON failures,
 * cycles and oversized values become deterministic rejects rather than throws.
 */
export function safelyParseUnknown<T>(
  value: unknown,
  parser: (candidate: unknown) => RuntimeParseResult<T>,
  maximumBytes = 512 * 1024,
): RuntimeParseResult<T> {
  try {
    const bytes = encodedByteLength(value)
    if (bytes === null) return reject('invalid_value', '$')
    if (bytes > maximumBytes) return reject('limit_exceeded', '$')
    return parser(value)
  } catch {
    return reject('invalid_value', '$')
  }
}
