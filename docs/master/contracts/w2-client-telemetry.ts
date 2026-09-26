/**
 * Browser telemetry boundary derived from W4 HANDOFF_W2_SECURITY.
 * Unknown keys reject; this function never redacts-and-forwards payloads.
 */

export type ClientTelemetryVocabulary = {
  statusCodes: ReadonlySet<string>
  blockKinds: ReadonlySet<string>
}

export type DurationBucket =
  | 'lt_250ms'
  | '250_999ms'
  | '1_3s'
  | '3_10s'
  | 'gte_10s'

export type RetryOutcome =
  | 'not_attempted'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type ClientTelemetryEnvelope = {
  contractVersion: string | number
  statusCode: string
  blockKind?: string
  correlationId?: string
  durationBucket: DurationBucket
  retryOutcome: RetryOutcome
  releaseVersion?: string
  environment?: string
}

const allowedKeys = new Set([
  'contractVersion',
  'statusCode',
  'blockKind',
  'correlationId',
  'durationBucket',
  'retryOutcome',
  'releaseVersion',
  'environment',
])

const durationBuckets = new Set<DurationBucket>([
  'lt_250ms',
  '250_999ms',
  '1_3s',
  '3_10s',
  'gte_10s',
])

const retryOutcomes = new Set<RetryOutcome>([
  'not_attempted',
  'succeeded',
  'failed',
  'cancelled',
])

const safeBuildLabel = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const safeCorrelationId = /^[A-Za-z0-9_-]{16,96}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function validateClientTelemetry(
  value: unknown,
  vocabulary: ClientTelemetryVocabulary,
): ClientTelemetryEnvelope | null {
  if (!isRecord(value)) return null
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

  if (
    (typeof value.contractVersion !== 'string' &&
      typeof value.contractVersion !== 'number') ||
    !vocabulary.statusCodes.has(String(value.statusCode)) ||
    !durationBuckets.has(value.durationBucket as DurationBucket) ||
    !retryOutcomes.has(value.retryOutcome as RetryOutcome)
  ) {
    return null
  }

  if (
    value.blockKind !== undefined &&
    !vocabulary.blockKinds.has(String(value.blockKind))
  ) {
    return null
  }

  if (
    value.correlationId !== undefined &&
    (typeof value.correlationId !== 'string' ||
      !safeCorrelationId.test(value.correlationId))
  ) {
    return null
  }

  for (const key of ['releaseVersion', 'environment'] as const) {
    if (
      value[key] !== undefined &&
      (typeof value[key] !== 'string' || !safeBuildLabel.test(value[key]))
    ) {
      return null
    }
  }

  return value as ClientTelemetryEnvelope
}
