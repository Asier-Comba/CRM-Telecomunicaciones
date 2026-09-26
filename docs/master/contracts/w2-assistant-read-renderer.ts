import {
  accept,
  hasOnlyKeys,
  isBoundedString,
  isRecord,
  isSafeOpaqueReference,
  isStrictIsoUtcDateTime,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'

export const W3_ASSISTANT_RESPONSE_VERSION = 1 as const

export const ASSISTANT_READ_STATUSES = [
  'SUCCESS',
  'EMPTY',
  'PARTIAL',
  'AMBIGUOUS',
  'NOT_FOUND',
  'FORBIDDEN',
  'CONFIRMATION_REQUIRED',
  'INVALID_CONFIRMATION',
  'INVALID_INPUT',
  'CONFLICT',
  'POLICY_BLOCK',
  'UNAVAILABLE',
  'INTERNAL_ERROR',
] as const

export type AssistantReadStatus = (typeof ASSISTANT_READ_STATUSES)[number]
export type AssistantScalar = string | number | boolean | null

export type AssistantReadTaxonomy = Readonly<{
  version: string
  modules: ReadonlySet<string>
  entityTypes: ReadonlySet<string>
}>

export type ParsedAssistantNotice = Readonly<{
  code: string
  retryable: boolean
  title?: string
  detail?: string
}>

export type ParsedAssistantTable = Readonly<{
  columns: readonly Readonly<{
    key: string
    label: string
    format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'status'
    currency?: string
  }>[]
  rows: readonly Readonly<Record<string, AssistantScalar>>[]
  rowIdentity?: Readonly<{ key: string }>
  truncated: boolean
  continuation?: Readonly<{ cursor?: string; total?: number }>
}>

export type ParsedAssistantResponse = Readonly<{
  contractVersion: 1
  answer: string
  status: AssistantReadStatus
  grounded: boolean
  blocks: Readonly<{
    entities?: readonly Readonly<{
      entityType: string
      entityId: string
      label: string
      subtitle?: string
    }>[]
    table?: ParsedAssistantTable
    confirmation?: Readonly<{
      confirmationId: string
      capability: string
      status: 'pending'
      title: string
      summary: string
      risk: 'safe_write' | 'sensitive_write' | 'irreversible'
      expiresAt: string
      allowedActions: readonly ['confirm', 'cancel']
    }>
    followUps?: readonly Readonly<{
      label: string
      prompt: string
      kind: 'suggestion' | 'refine'
    }>[]
    navigation?: Readonly<{
      module: string
      entityType?: string
      entityId?: string
      view?: string
    }>
    notice?: ParsedAssistantNotice
  }>
  meta: Readonly<{
    requestId: string
    capability?: string
    partial: boolean
    taxonomyVersion?: string
  }>
}>

const statuses = new Set<string>(ASSISTANT_READ_STATUSES)
const tableFormats = new Set([
  'text',
  'number',
  'currency',
  'date',
  'datetime',
  'status',
])
const followUpKinds = new Set(['suggestion', 'refine'])
const sensitiveKey =
  /token|secret|password|passwd|cookie|authorization|api[-_]?key|session/i
const highConfidenceSecret =
  /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|AWS_SECRET_ACCESS_KEY\s*[=:]\s*[A-Za-z0-9/+=]{16,})/i

const owns = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const exactShape = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean =>
  required.every((key) => owns(value, key)) &&
  hasOnlyKeys(value, [...required, ...optional])

const safeText = (
  value: unknown,
  maximum: number,
  allowEmpty = false,
): value is string =>
  typeof value === 'string' &&
  value.length <= maximum &&
  (allowEmpty || (value.length > 0 && value.trim().length > 0))

const parseNotice = (
  value: unknown,
  path: string,
): RuntimeParseResult<ParsedAssistantNotice> => {
  if (!isRecord(value)) return reject('expected_object', path)
  if (!exactShape(value, ['code', 'retryable'], ['title', 'detail'])) {
    return reject('unknown_field', path)
  }
  if (
    typeof value.code !== 'string' ||
    !/^[a-z][a-z0-9_]{1,63}$/.test(value.code)
  ) {
    return reject('invalid_value', `${path}.code`)
  }
  if (typeof value.retryable !== 'boolean') {
    return reject('wrong_type', `${path}.retryable`)
  }
  if (owns(value, 'title') && !safeText(value.title, 120)) {
    return reject('invalid_value', `${path}.title`)
  }
  if (owns(value, 'detail') && !safeText(value.detail, 500)) {
    return reject('invalid_value', `${path}.detail`)
  }
  return accept(
    Object.freeze({
      code: value.code,
      retryable: value.retryable,
      ...(typeof value.title === 'string' ? { title: value.title } : {}),
      ...(typeof value.detail === 'string' ? { detail: value.detail } : {}),
    }),
  )
}

const parseTable = (
  value: unknown,
  path: string,
): RuntimeParseResult<ParsedAssistantTable> => {
  if (!isRecord(value)) return reject('expected_object', path)
  if (
    !exactShape(value, ['columns', 'rows', 'truncated'], [
      'rowIdentity',
      'continuation',
    ])
  ) {
    return reject('unknown_field', path)
  }
  if (
    !Array.isArray(value.columns) ||
    value.columns.length === 0 ||
    value.columns.length > 20
  ) {
    return reject('limit_exceeded', `${path}.columns`)
  }
  if (!Array.isArray(value.rows) || value.rows.length > 100) {
    return reject('limit_exceeded', `${path}.rows`)
  }
  if (typeof value.truncated !== 'boolean') {
    return reject('wrong_type', `${path}.truncated`)
  }

  const columns: Array<ParsedAssistantTable['columns'][number]> = []
  const columnKeys = new Set<string>()
  for (const [index, candidate] of value.columns.entries()) {
    const columnPath = `${path}.columns[${index}]`
    if (
      !isRecord(candidate) ||
      !exactShape(candidate, ['key', 'label'], ['format', 'currency'])
    ) {
      return reject('expected_object', columnPath)
    }
    if (!safeText(candidate.key, 64) || !safeText(candidate.label, 120)) {
      return reject('invalid_value', columnPath)
    }
    if (columnKeys.has(candidate.key)) {
      return reject('invalid_value', `${columnPath}.key`)
    }
    if (
      owns(candidate, 'format') &&
      (typeof candidate.format !== 'string' ||
        !tableFormats.has(candidate.format))
    ) {
      return reject('unknown_enum', `${columnPath}.format`)
    }
    if (
      candidate.format === 'currency' &&
      (typeof candidate.currency !== 'string' ||
        !/^[A-Z]{3}$/.test(candidate.currency))
    ) {
      return reject('invalid_value', `${columnPath}.currency`)
    }
    if (candidate.format !== 'currency' && owns(candidate, 'currency')) {
      return reject('invalid_value', `${columnPath}.currency`)
    }
    columnKeys.add(candidate.key)
    columns.push(
      Object.freeze({
        key: candidate.key,
        label: candidate.label,
        ...(typeof candidate.format === 'string'
          ? { format: candidate.format as ParsedAssistantTable['columns'][number]['format'] }
          : {}),
        ...(typeof candidate.currency === 'string'
          ? { currency: candidate.currency }
          : {}),
      }),
    )
  }

  const rows: Array<Readonly<Record<string, AssistantScalar>>> = []
  for (const [index, candidate] of value.rows.entries()) {
    const rowPath = `${path}.rows[${index}]`
    if (!isRecord(candidate)) return reject('expected_object', rowPath)
    if (Object.keys(candidate).some((key) => !columnKeys.has(key))) {
      return reject('unknown_field', rowPath)
    }
    for (const [key, cell] of Object.entries(candidate)) {
      if (
        cell !== null &&
        typeof cell !== 'string' &&
        typeof cell !== 'number' &&
        typeof cell !== 'boolean'
      ) {
        return reject('wrong_type', `${rowPath}.${key}`)
      }
      if (
        (typeof cell === 'string' && cell.length > 2_000) ||
        (typeof cell === 'number' && !Number.isFinite(cell))
      ) {
        return reject('limit_exceeded', `${rowPath}.${key}`)
      }
    }
    rows.push(Object.freeze({ ...candidate }) as Record<string, AssistantScalar>)
  }

  let rowIdentity: { key: string } | undefined
  if (owns(value, 'rowIdentity')) {
    if (
      !isRecord(value.rowIdentity) ||
      !exactShape(value.rowIdentity, ['key']) ||
      typeof value.rowIdentity.key !== 'string' ||
      !columnKeys.has(value.rowIdentity.key)
    ) {
      return reject('invalid_value', `${path}.rowIdentity`)
    }
    const key = value.rowIdentity.key
    const identities = rows.map((row) => row[key])
    if (
      identities.some(
        (identity) =>
          typeof identity !== 'string' && typeof identity !== 'number',
      ) ||
      new Set(identities.map(String)).size !== identities.length
    ) {
      return reject('invalid_value', `${path}.rowIdentity`)
    }
    rowIdentity = { key }
  }

  let continuation: { cursor?: string; total?: number } | undefined
  if (owns(value, 'continuation')) {
    if (
      !isRecord(value.continuation) ||
      !hasOnlyKeys(value.continuation, ['cursor', 'total']) ||
      (!owns(value.continuation, 'cursor') &&
        !owns(value.continuation, 'total'))
    ) {
      return reject('invalid_value', `${path}.continuation`)
    }
    if (
      owns(value.continuation, 'cursor') &&
      !safeText(value.continuation.cursor, 256)
    ) {
      return reject('invalid_value', `${path}.continuation.cursor`)
    }
    if (
      owns(value.continuation, 'total') &&
      (!Number.isSafeInteger(value.continuation.total) ||
        Number(value.continuation.total) < 0)
    ) {
      return reject('invalid_value', `${path}.continuation.total`)
    }
    continuation = {
      ...(typeof value.continuation.cursor === 'string'
        ? { cursor: value.continuation.cursor }
        : {}),
      ...(typeof value.continuation.total === 'number'
        ? { total: value.continuation.total }
        : {}),
    }
  }
  if (value.truncated && continuation === undefined) {
    return reject('missing_field', `${path}.continuation`)
  }

  return accept(
    Object.freeze({
      columns: Object.freeze(columns),
      rows: Object.freeze(rows),
      ...(rowIdentity ? { rowIdentity: Object.freeze(rowIdentity) } : {}),
      truncated: value.truncated,
      ...(continuation
        ? { continuation: Object.freeze(continuation) }
        : {}),
    }),
  )
}

const containsSensitiveMaterial = (value: unknown): boolean => {
  try {
    const encoded = JSON.stringify(value)
    return sensitiveKey.test(encoded) || highConfidenceSecret.test(encoded)
  } catch {
    return true
  }
}

export function parseAssistantReadResponse(
  input: unknown,
  taxonomy?: AssistantReadTaxonomy,
): RuntimeParseResult<ParsedAssistantResponse> {
  return safelyParseUnknown(input, (candidate) => {
    if (!isRecord(candidate)) return reject('expected_object', '$')
    if (
      !exactShape(candidate, [
        'contractVersion',
        'answer',
        'status',
        'grounded',
        'blocks',
        'meta',
      ])
    ) {
      return reject('unknown_field', '$')
    }
    if (candidate.contractVersion !== 1) {
      return reject('unknown_enum', '$.contractVersion')
    }
    if (!safeText(candidate.answer, 12_000, true)) {
      return reject('limit_exceeded', '$.answer')
    }
    if (
      typeof candidate.status !== 'string' ||
      !statuses.has(candidate.status)
    ) {
      return reject('unknown_enum', '$.status')
    }
    if (typeof candidate.grounded !== 'boolean') {
      return reject('wrong_type', '$.grounded')
    }
    if (!isRecord(candidate.blocks) || !isRecord(candidate.meta)) {
      return reject('expected_object', '$.blocks')
    }
    if (
      !hasOnlyKeys(candidate.blocks, [
        'entities',
        'table',
        'confirmation',
        'followUps',
        'navigation',
        'notice',
      ]) ||
      !exactShape(candidate.meta, ['requestId', 'partial'], [
        'capability',
        'taxonomyVersion',
      ])
    ) {
      return reject('unknown_field', '$.blocks')
    }
    if (!safeText(candidate.meta.requestId, 128)) {
      return reject('invalid_identifier', '$.meta.requestId')
    }
    if (typeof candidate.meta.partial !== 'boolean') {
      return reject('wrong_type', '$.meta.partial')
    }
    if (
      owns(candidate.meta, 'capability') &&
      !safeText(candidate.meta.capability, 160)
    ) {
      return reject('invalid_value', '$.meta.capability')
    }
    if (
      owns(candidate.meta, 'taxonomyVersion') &&
      !safeText(candidate.meta.taxonomyVersion, 96)
    ) {
      return reject('invalid_value', '$.meta.taxonomyVersion')
    }
    if (
      taxonomy &&
      candidate.meta.taxonomyVersion !== taxonomy.version
    ) {
      return reject('invalid_value', '$.meta.taxonomyVersion')
    }

    const blocks: Record<string, unknown> = {}
    if (owns(candidate.blocks, 'notice')) {
      const notice = parseNotice(candidate.blocks.notice, '$.blocks.notice')
      if (!notice.ok) return notice
      blocks.notice = notice.value
    }
    if (owns(candidate.blocks, 'table')) {
      if (!candidate.grounded) return reject('invalid_value', '$.blocks.table')
      const table = parseTable(candidate.blocks.table, '$.blocks.table')
      if (!table.ok) return table
      blocks.table = table.value
    }
    if (owns(candidate.blocks, 'followUps')) {
      if (
        !Array.isArray(candidate.blocks.followUps) ||
        candidate.blocks.followUps.length > 6
      ) {
        return reject('limit_exceeded', '$.blocks.followUps')
      }
      const followUps: Array<Record<string, string>> = []
      for (const [index, value] of candidate.blocks.followUps.entries()) {
        const path = `$.blocks.followUps[${index}]`
        if (!isRecord(value) || !exactShape(value, ['label', 'prompt', 'kind'])) {
          return reject('expected_object', path)
        }
        if (
          !safeText(value.label, 100) ||
          !safeText(value.prompt, 500) ||
          typeof value.kind !== 'string' ||
          !followUpKinds.has(value.kind)
        ) {
          return reject('invalid_value', path)
        }
        followUps.push({
          label: value.label,
          prompt: value.prompt,
          kind: value.kind,
        })
      }
      blocks.followUps = Object.freeze(followUps)
    }
    if (owns(candidate.blocks, 'entities')) {
      if (
        !taxonomy ||
        !candidate.grounded ||
        !Array.isArray(candidate.blocks.entities) ||
        candidate.blocks.entities.length > 50
      ) {
        return reject('invalid_value', '$.blocks.entities')
      }
      const entities: Array<Record<string, string>> = []
      for (const [index, value] of candidate.blocks.entities.entries()) {
        const path = `$.blocks.entities[${index}]`
        if (
          !isRecord(value) ||
          !exactShape(value, ['entityType', 'entityId', 'label'], ['subtitle']) ||
          typeof value.entityType !== 'string' ||
          !taxonomy.entityTypes.has(value.entityType) ||
          !isSafeOpaqueReference(value.entityId) ||
          !safeText(value.label, 200) ||
          (owns(value, 'subtitle') && !safeText(value.subtitle, 300))
        ) {
          return reject('invalid_value', path)
        }
        entities.push({
          entityType: value.entityType,
          entityId: value.entityId,
          label: value.label,
          ...(typeof value.subtitle === 'string'
            ? { subtitle: value.subtitle }
            : {}),
        })
      }
      blocks.entities = Object.freeze(entities)
    }
    if (owns(candidate.blocks, 'navigation')) {
      const value = candidate.blocks.navigation
      if (
        !taxonomy ||
        !isRecord(value) ||
        !exactShape(value, ['module'], ['entityType', 'entityId', 'view']) ||
        typeof value.module !== 'string' ||
        !taxonomy.modules.has(value.module) ||
        (owns(value, 'entityType') &&
          (typeof value.entityType !== 'string' ||
            !taxonomy.entityTypes.has(value.entityType))) ||
        (owns(value, 'entityId') && !isSafeOpaqueReference(value.entityId)) ||
        (owns(value, 'view') && !safeText(value.view, 80))
      ) {
        return reject('invalid_value', '$.blocks.navigation')
      }
      blocks.navigation = Object.freeze({ ...value })
    }
    if (owns(candidate.blocks, 'confirmation')) {
      const value = candidate.blocks.confirmation
      if (
        !isRecord(value) ||
        !exactShape(value, [
          'confirmationId',
          'capability',
          'status',
          'title',
          'summary',
          'risk',
          'expiresAt',
          'allowedActions',
        ]) ||
        !safeText(value.confirmationId, 200) ||
        value.confirmationId.length < 16 ||
        !safeText(value.capability, 160) ||
        value.status !== 'pending' ||
        !safeText(value.title, 160) ||
        !safeText(value.summary, 1_000) ||
        (value.risk !== 'safe_write' &&
          value.risk !== 'sensitive_write' &&
          value.risk !== 'irreversible') ||
        !isStrictIsoUtcDateTime(value.expiresAt) ||
        !Array.isArray(value.allowedActions) ||
        value.allowedActions.length !== 2 ||
        value.allowedActions[0] !== 'confirm' ||
        value.allowedActions[1] !== 'cancel'
      ) {
        return reject('invalid_value', '$.blocks.confirmation')
      }
      blocks.confirmation = Object.freeze({
        confirmationId: value.confirmationId,
        capability: value.capability,
        status: value.status,
        title: value.title,
        summary: value.summary,
        risk: value.risk,
        expiresAt: value.expiresAt,
        allowedActions: Object.freeze(['confirm', 'cancel'] as const),
      })
    }

    if (containsSensitiveMaterial(candidate)) {
      return reject('invalid_value', '$')
    }

    return accept(
      Object.freeze({
        contractVersion: 1 as const,
        answer: candidate.answer,
        status: candidate.status as AssistantReadStatus,
        grounded: candidate.grounded,
        blocks: Object.freeze(blocks),
        meta: Object.freeze({
          requestId: candidate.meta.requestId,
          partial: candidate.meta.partial,
          ...(typeof candidate.meta.capability === 'string'
            ? { capability: candidate.meta.capability }
            : {}),
          ...(typeof candidate.meta.taxonomyVersion === 'string'
            ? { taxonomyVersion: candidate.meta.taxonomyVersion }
            : {}),
        }),
      }) as ParsedAssistantResponse,
    )
  })
}

export type AssistantReadRenderModel = Readonly<{
  answerText: string
  status: AssistantReadStatus
  grounded: boolean
  notice: ParsedAssistantNotice | null
  table: ParsedAssistantTable | null
  entities: ParsedAssistantResponse['blocks']['entities'] | null
  navigation: ParsedAssistantResponse['blocks']['navigation'] | null
  followUps: ParsedAssistantResponse['blocks']['followUps'] | null
  confirmation:
    | null
    | Readonly<{
        title: string
        summary: string
        risk: 'safe_write' | 'sensitive_write' | 'irreversible'
        interaction: 'release_disabled'
        actions: readonly []
      }>
}>

/** Text remains text; the eventual React renderer must never use raw HTML. */
export function toAssistantReadRenderModel(
  response: ParsedAssistantResponse,
): AssistantReadRenderModel {
  const confirmation = response.blocks.confirmation
  return Object.freeze({
    answerText: response.answer,
    status: response.status,
    grounded: response.grounded,
    notice: response.blocks.notice ?? null,
    table: response.blocks.table ?? null,
    entities: response.blocks.entities ?? null,
    navigation: response.blocks.navigation ?? null,
    followUps: response.blocks.followUps ?? null,
    confirmation: confirmation
      ? Object.freeze({
          title: confirmation.title,
          summary: confirmation.summary,
          risk: confirmation.risk,
          interaction: 'release_disabled' as const,
          actions: Object.freeze([]),
        })
      : null,
  })
}

