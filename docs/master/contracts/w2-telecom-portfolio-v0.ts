import {
  type EntitySummary,
  type OpaqueId,
  type SectionState,
  type SensitiveField,
} from './w2-presentation-v0.ts'
import {
  accept,
  isBoundedString,
  isRecord,
  isSafeOpaqueReference,
  isStrictIsoDate,
  isStrictIsoUtcDateTime,
  reject,
  safelyParseUnknown,
  type RuntimeParseResult,
} from './w2-runtime-validation.ts'

type EntityRefV0Input = { id: string; display_name: string }

export type RenewalWindowV0Input = {
  opens_on: string | null
  closes_on: string | null
  status: 'not_open' | 'open' | 'overdue' | 'completed' | 'not_applicable'
}

export type TelecomContractV0Input = {
  id: string
  workspace_id: string
  customer_id: string
  operator: EntityRefV0Input
  service_ids: readonly string[]
  line_ids: readonly string[]
  start_date: string
  commitment_end_date: string | null
  end_date: string | null
  renewal_window: RenewalWindowV0Input
  assignee: EntityRefV0Input | null
  lifecycle: 'draft' | 'active' | 'renewal_due' | 'ended' | 'cancelled'
}

export type ServiceLineV0Input = {
  id: string
  workspace_id: string
  kind: 'service' | 'line'
  customer_id: string
  contract_id: string
  operator: EntityRefV0Input
  plan_tariff: EntityRefV0Input | null
  status: 'pending' | 'active' | 'suspended' | 'cancelled'
}

export type PermanencePresentation =
  | { status: 'known'; endsOn: string }
  | { status: 'not_available' }

export type RenewalPresentation = {
  status: RenewalWindowV0Input['status']
  opensOn: string | null
  closesOn: string | null
}

type PortfolioSummaryBase = {
  entityRef: OpaqueId
  displayIdentifier: SensitiveField<string>
  operator: EntitySummary
  sourceUpdatedAt: string
}

export type ContractSummaryPresentation = PortfolioSummaryBase & {
  lifecycle: TelecomContractV0Input['lifecycle']
  startDate: string
  endDate: string | null
  permanence: PermanencePresentation
  renewal: RenewalPresentation
  assignee: EntitySummary | null
  serviceCount: number
  lineCount: number
}

export type ServiceSummaryPresentation = PortfolioSummaryBase & {
  kind: 'service'
  status: ServiceLineV0Input['status']
  planTariff: EntitySummary | null
}

export type LineSummaryPresentation = PortfolioSummaryBase & {
  kind: 'line'
  status: ServiceLineV0Input['status']
  planTariff: EntitySummary | null
}

export type PortfolioAdapterContext = {
  serverWorkspaceId: string
  expectedCustomerId: string
  sourceUpdatedAt: string
}

const contractKeys = [
  'id',
  'workspace_id',
  'customer_id',
  'operator',
  'service_ids',
  'line_ids',
  'start_date',
  'commitment_end_date',
  'end_date',
  'renewal_window',
  'assignee',
  'lifecycle',
] as const
const serviceLineKeys = [
  'id',
  'workspace_id',
  'kind',
  'customer_id',
  'contract_id',
  'operator',
  'plan_tariff',
  'status',
] as const
const entityKeys = ['id', 'display_name'] as const
const renewalKeys = ['opens_on', 'closes_on', 'status'] as const

const parseClosedRecord = (
  value: unknown,
  keys: readonly string[],
  path: string,
): RuntimeParseResult<Record<string, unknown>> => {
  if (!isRecord(value)) return reject('expected_object', path)
  const unknown = Object.keys(value).find((key) => !keys.includes(key))
  if (unknown) return reject('unknown_field', `${path}.${unknown}`)
  const missing = keys.find(
    (key) => !Object.prototype.hasOwnProperty.call(value, key),
  )
  return missing ? reject('missing_field', `${path}.${missing}`) : accept(value)
}

const parseEntity = (
  value: unknown,
  path: string,
): RuntimeParseResult<EntityRefV0Input> => {
  const parsed = parseClosedRecord(value, entityKeys, path)
  if (!parsed.ok) return parsed
  if (!isSafeOpaqueReference(parsed.value.id)) {
    return reject('invalid_identifier', `${path}.id`)
  }
  if (
    !isBoundedString(parsed.value.display_name, 1, 200) ||
    !parsed.value.display_name.trim()
  ) {
    return reject('invalid_value', `${path}.display_name`)
  }
  return accept({
    id: parsed.value.id,
    display_name: parsed.value.display_name,
  })
}

const parseNullableDate = (
  value: unknown,
  path: string,
): RuntimeParseResult<string | null> =>
  value === null
    ? accept(null)
    : isStrictIsoDate(value)
      ? accept(value)
      : reject('invalid_date', path)

const parseIdList = (
  value: unknown,
  path: string,
): RuntimeParseResult<readonly string[]> => {
  if (!Array.isArray(value)) return reject('wrong_type', path)
  if (value.length > 500) return reject('limit_exceeded', path)
  const ids: string[] = []
  const unique = new Set<string>()
  for (const [index, id] of value.entries()) {
    if (!isSafeOpaqueReference(id)) {
      return reject('invalid_identifier', `${path}[${index}]`)
    }
    if (unique.has(id)) return reject('invalid_value', `${path}[${index}]`)
    unique.add(id)
    ids.push(id)
  }
  return accept(ids)
}

const parseRenewal = (
  value: unknown,
  path: string,
): RuntimeParseResult<RenewalWindowV0Input> => {
  const parsed = parseClosedRecord(value, renewalKeys, path)
  if (!parsed.ok) return parsed
  const opens = parseNullableDate(parsed.value.opens_on, `${path}.opens_on`)
  if (!opens.ok) return opens
  const closes = parseNullableDate(parsed.value.closes_on, `${path}.closes_on`)
  if (!closes.ok) return closes
  const status = parsed.value.status
  if (
    status !== 'not_open' &&
    status !== 'open' &&
    status !== 'overdue' &&
    status !== 'completed' &&
    status !== 'not_applicable'
  ) {
    return reject('unknown_enum', `${path}.status`)
  }
  if (opens.value && closes.value && opens.value > closes.value) {
    return reject('invalid_value', path)
  }
  return accept({
    opens_on: opens.value,
    closes_on: closes.value,
    status,
  })
}

const parseContract = (
  value: unknown,
  index: number,
): RuntimeParseResult<TelecomContractV0Input> => {
  const path = `$[${index}]`
  const parsed = parseClosedRecord(value, contractKeys, path)
  if (!parsed.ok) return parsed
  const contract = parsed.value
  for (const [key, id] of [
    ['id', contract.id],
    ['workspace_id', contract.workspace_id],
    ['customer_id', contract.customer_id],
  ] as const) {
    if (!isSafeOpaqueReference(id)) {
      return reject('invalid_identifier', `${path}.${key}`)
    }
  }
  const operator = parseEntity(contract.operator, `${path}.operator`)
  if (!operator.ok) return operator
  const services = parseIdList(contract.service_ids, `${path}.service_ids`)
  if (!services.ok) return services
  const lines = parseIdList(contract.line_ids, `${path}.line_ids`)
  if (!lines.ok) return lines
  if (!isStrictIsoDate(contract.start_date)) {
    return reject('invalid_date', `${path}.start_date`)
  }
  const commitment = parseNullableDate(
    contract.commitment_end_date,
    `${path}.commitment_end_date`,
  )
  if (!commitment.ok) return commitment
  const end = parseNullableDate(contract.end_date, `${path}.end_date`)
  if (!end.ok) return end
  const renewal = parseRenewal(contract.renewal_window, `${path}.renewal_window`)
  if (!renewal.ok) return renewal
  const assignee =
    contract.assignee === null
      ? accept<EntityRefV0Input | null>(null)
      : parseEntity(contract.assignee, `${path}.assignee`)
  if (!assignee.ok) return assignee
  const lifecycle = contract.lifecycle
  if (
    lifecycle !== 'draft' &&
    lifecycle !== 'active' &&
    lifecycle !== 'renewal_due' &&
    lifecycle !== 'ended' &&
    lifecycle !== 'cancelled'
  ) {
    return reject('unknown_enum', `${path}.lifecycle`)
  }
  return accept({
    id: contract.id,
    workspace_id: contract.workspace_id,
    customer_id: contract.customer_id,
    operator: operator.value,
    service_ids: services.value,
    line_ids: lines.value,
    start_date: contract.start_date,
    commitment_end_date: commitment.value,
    end_date: end.value,
    renewal_window: renewal.value,
    assignee: assignee.value,
    lifecycle,
  })
}

const parseServiceLine = (
  value: unknown,
  index: number,
): RuntimeParseResult<ServiceLineV0Input> => {
  const path = `$[${index}]`
  const parsed = parseClosedRecord(value, serviceLineKeys, path)
  if (!parsed.ok) return parsed
  const item = parsed.value
  for (const [key, id] of [
    ['id', item.id],
    ['workspace_id', item.workspace_id],
    ['customer_id', item.customer_id],
    ['contract_id', item.contract_id],
  ] as const) {
    if (!isSafeOpaqueReference(id)) {
      return reject('invalid_identifier', `${path}.${key}`)
    }
  }
  if (item.kind !== 'service' && item.kind !== 'line') {
    return reject('unknown_enum', `${path}.kind`)
  }
  const operator = parseEntity(item.operator, `${path}.operator`)
  if (!operator.ok) return operator
  const plan =
    item.plan_tariff === null
      ? accept<EntityRefV0Input | null>(null)
      : parseEntity(item.plan_tariff, `${path}.plan_tariff`)
  if (!plan.ok) return plan
  const status = item.status
  if (
    status !== 'pending' &&
    status !== 'active' &&
    status !== 'suspended' &&
    status !== 'cancelled'
  ) {
    return reject('unknown_enum', `${path}.status`)
  }
  return accept({
    id: item.id,
    workspace_id: item.workspace_id,
    kind: item.kind,
    customer_id: item.customer_id,
    contract_id: item.contract_id,
    operator: operator.value,
    plan_tariff: plan.value,
    status,
  })
}

const parseCollection = <T>(
  value: unknown,
  parser: (candidate: unknown, index: number) => RuntimeParseResult<T>,
): RuntimeParseResult<readonly T[]> =>
  safelyParseUnknown(value, (candidate) => {
    if (!Array.isArray(candidate)) return reject('wrong_type', '$')
    if (candidate.length > 200) return reject('limit_exceeded', '$')
    const items: T[] = []
    for (const [index, item] of candidate.entries()) {
      const parsed = parser(item, index)
      if (!parsed.ok) return parsed
      items.push(parsed.value)
    }
    return accept(items)
  })

export const parseTelecomContractsV0 = (
  value: unknown,
): RuntimeParseResult<readonly TelecomContractV0Input[]> =>
  parseCollection(value, parseContract)

export const parseServiceLinesV0 = (
  value: unknown,
): RuntimeParseResult<readonly ServiceLineV0Input[]> =>
  parseCollection(value, parseServiceLine)

const invalidSection = <T>(): SectionState<T> => ({
  status: 'error',
  error: {
    code: 'invalid_response',
    message: 'No se ha podido interpretar esta sección.',
    retryable: false,
  },
})

const forbiddenSection = <T>(): SectionState<T> => ({ status: 'forbidden' })

const entitySummary = (value: EntityRefV0Input): EntitySummary => ({
  id: value.id as OpaqueId,
  label: value.display_name,
})

const contextIsValid = (context: PortfolioAdapterContext): boolean =>
  isSafeOpaqueReference(context.serverWorkspaceId) &&
  isSafeOpaqueReference(context.expectedCustomerId) &&
  isStrictIsoUtcDateTime(context.sourceUpdatedAt)

export function adaptTelecomContractsV0(
  input: unknown,
  context: PortfolioAdapterContext,
): SectionState<readonly ContractSummaryPresentation[]> {
  if (!contextIsValid(context)) return invalidSection()
  const parsed = parseTelecomContractsV0(input)
  if (!parsed.ok) return invalidSection()
  if (parsed.value.length === 0) {
    return { status: 'empty', updatedAt: context.sourceUpdatedAt }
  }
  if (
    parsed.value.some(
      (contract) =>
        contract.workspace_id !== context.serverWorkspaceId ||
        contract.customer_id !== context.expectedCustomerId,
    )
  ) {
    return forbiddenSection()
  }

  return {
    status: 'ready',
    updatedAt: context.sourceUpdatedAt,
    completeness: { kind: 'unknown' },
    data: parsed.value.map((contract) => ({
      entityRef: contract.id as OpaqueId,
      displayIdentifier: { visibility: 'hidden' },
      operator: entitySummary(contract.operator),
      sourceUpdatedAt: context.sourceUpdatedAt,
      lifecycle: contract.lifecycle,
      startDate: contract.start_date,
      endDate: contract.end_date,
      permanence:
        contract.commitment_end_date === null
          ? { status: 'not_available' }
          : { status: 'known', endsOn: contract.commitment_end_date },
      renewal: {
        status: contract.renewal_window.status,
        opensOn: contract.renewal_window.opens_on,
        closesOn: contract.renewal_window.closes_on,
      },
      assignee:
        contract.assignee === null ? null : entitySummary(contract.assignee),
      serviceCount: contract.service_ids.length,
      lineCount: contract.line_ids.length,
    })),
  }
}

export function adaptServiceLinesV0(
  input: unknown,
  context: PortfolioAdapterContext,
): {
  services: SectionState<readonly ServiceSummaryPresentation[]>
  lines: SectionState<readonly LineSummaryPresentation[]>
} {
  if (!contextIsValid(context)) {
    return { services: invalidSection(), lines: invalidSection() }
  }
  const parsed = parseServiceLinesV0(input)
  if (!parsed.ok) return { services: invalidSection(), lines: invalidSection() }
  if (
    parsed.value.some(
      (item) =>
        item.workspace_id !== context.serverWorkspaceId ||
        item.customer_id !== context.expectedCustomerId,
    )
  ) {
    return { services: forbiddenSection(), lines: forbiddenSection() }
  }

  const services: ServiceSummaryPresentation[] = []
  const lines: LineSummaryPresentation[] = []
  for (const item of parsed.value) {
    const shared = {
      entityRef: item.id as OpaqueId,
      displayIdentifier: { visibility: 'hidden' } as const,
      operator: entitySummary(item.operator),
      sourceUpdatedAt: context.sourceUpdatedAt,
      status: item.status,
      planTariff:
        item.plan_tariff === null ? null : entitySummary(item.plan_tariff),
    }
    if (item.kind === 'service') services.push({ ...shared, kind: 'service' })
    else lines.push({ ...shared, kind: 'line' })
  }

  const state = <T>(items: readonly T[]): SectionState<readonly T[]> =>
    items.length === 0
      ? { status: 'empty', updatedAt: context.sourceUpdatedAt }
      : {
          status: 'ready',
          data: items,
          updatedAt: context.sourceUpdatedAt,
          completeness: { kind: 'unknown' },
        }
  return { services: state(services), lines: state(lines) }
}
