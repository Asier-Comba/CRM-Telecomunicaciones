/**
 * Browser telemetry boundary derived from W4 HANDOFF_W2_SECURITY.
 * Unknown keys reject; this function never redacts-and-forwards payloads.
 */

export type ClientTelemetryVocabulary = {
  contractVersions: ReadonlySet<string | number>
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
  readonly contractVersion: string | number
  readonly statusCode: string
  readonly blockKind?: string
  readonly correlationId?: string
  readonly durationBucket: DurationBucket
  readonly retryOutcome: RetryOutcome
  readonly releaseVersion?: string
  readonly environment?: string
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
const safeNamedContractVersion = /^[a-z][a-z0-9.-]{0,23}\.v[1-9][0-9]{0,3}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSafeContractVersion = (
  value: unknown,
  vocabulary: ClientTelemetryVocabulary,
): value is string | number => {
  if (!vocabulary.contractVersions.has(value as string | number)) return false

  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 1 && value <= 9_999
  }

  return typeof value === 'string' && safeNamedContractVersion.test(value)
}

export function validateClientTelemetry(
  value: unknown,
  vocabulary: ClientTelemetryVocabulary,
): ClientTelemetryEnvelope | null {
  if (!isRecord(value)) return null
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null

  if (
    !isSafeContractVersion(value.contractVersion, vocabulary) ||
    typeof value.statusCode !== 'string' ||
    !vocabulary.statusCodes.has(value.statusCode) ||
    !durationBuckets.has(value.durationBucket as DurationBucket) ||
    !retryOutcomes.has(value.retryOutcome as RetryOutcome)
  ) {
    return null
  }

  if (
    value.blockKind !== undefined &&
    (typeof value.blockKind !== 'string' ||
      !vocabulary.blockKinds.has(value.blockKind))
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

  const result: ClientTelemetryEnvelope = {
    contractVersion: value.contractVersion,
    statusCode: value.statusCode,
    durationBucket: value.durationBucket as DurationBucket,
    retryOutcome: value.retryOutcome as RetryOutcome,
    ...(value.blockKind === undefined ? {} : { blockKind: value.blockKind }),
    ...(value.correlationId === undefined
      ? {}
      : { correlationId: value.correlationId }),
    ...(value.releaseVersion === undefined
      ? {}
      : { releaseVersion: value.releaseVersion }),
    ...(value.environment === undefined
      ? {}
      : { environment: value.environment }),
  }

  return Object.freeze(result)
}
