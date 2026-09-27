import type {
  ActivityItemV1,
  CollectionEnvelopeV1,
  ContractListInputV1,
  CustomerCompanyV1,
  CustomerSearchInputV1,
  CustomerSummaryV1,
  DashboardV1,
  LineListInputV1,
  MeetingItemV1,
  MeetingListInputV1,
  OpportunityItemV1,
  OpportunityListInputV1,
  PermanenceItemV1,
  ReadOneResponseV1,
  RenewalItemV1,
  ServerReadContextV1,
  ServiceListInputV1,
  TaskItemV1,
  TaskListInputV1,
  TelecomContractV1,
  TelecomLineV1,
  TelecomReadServiceV1,
  TelecomServiceV1,
  TelecomV1ReadOperation,
  WindowedListInputV1,
} from '../contracts/telecom-v1'
import type { TenantContext } from './tenant-context'

export interface TelecomReadAuthorizerV1 {
  authorize(context: ServerReadContextV1, operation: TelecomV1ReadOperation): Promise<boolean>
}

/**
 * Persistence adapter boundary. Implementations run server-side and receive the
 * already resolved workspace context; route/body inputs never provide it.
 */
export type TelecomReadRepositoryV1 = TelecomReadServiceV1

type CollectionInput = { limit: number; continuation: string | null }
const CONTRACT_VERSION = 'telecom.v1' as const

const unavailable = { code: 'temporary_unavailable', retryable: true } as const
const internal = { code: 'internal_safe', retryable: false } as const
const invalid = { code: 'validation', retryable: false } as const
const revoked = { code: 'access_revoked', retryable: false } as const

export function createTelecomReadContextV1(
  tenant: TenantContext,
  scopeEpoch: string,
): ServerReadContextV1 {
  if (!scopeEpoch.trim()) throw new Error('scope epoch is required')
  return {
    actor_id: tenant.userId,
    workspace_id: tenant.workspaceId,
    principal_kind: 'user',
    scope_epoch: scopeEpoch,
  }
}

function validContext(context: ServerReadContextV1): boolean {
  return typeof context.actor_id === 'string' && typeof context.workspace_id === 'string' && typeof context.scope_epoch === 'string' &&
    Boolean(context.actor_id.trim() && context.workspace_id.trim() && context.scope_epoch.trim())
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 16 && value.length <= 160
}

function closedInput(input: unknown, allowedKeys: readonly string[]): input is Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false
  return Object.keys(input).every((key) => allowedKeys.includes(key))
}

function validCollectionInput(input: CollectionInput, allowedKeys: readonly string[]): boolean {
  return closedInput(input, allowedKeys) && Number.isInteger(input.limit) && input.limit >= 1 && input.limit <= 100 &&
    (input.continuation === null || (typeof input.continuation === 'string' && input.continuation.length >= 16 && input.continuation.length <= 256))
}

function validOptionalIds(input: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => input[key] === undefined || validId(input[key]))
}

function validDateBounds(input: Record<string, unknown>, fromKey: string, toKey: string): boolean {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  const from = input[fromKey]
  const to = input[toKey]
  if (from !== undefined && (typeof from !== 'string' || !isoDate.test(from))) return false
  if (to !== undefined && (typeof to !== 'string' || !isoDate.test(to))) return false
  return typeof from !== 'string' || typeof to !== 'string' || from <= to
}

function validEnum(input: Record<string, unknown>, key: string, values: readonly string[]): boolean {
  return input[key] === undefined || (typeof input[key] === 'string' && values.includes(input[key]))
}

function collectionFailure<T>(
  context: ServerReadContextV1,
  sourceState: 'not_authorized' | 'error',
  error: typeof unavailable | typeof internal | typeof invalid | typeof revoked | null,
): CollectionEnvelopeV1<T> {
  return {
    contract_version: CONTRACT_VERSION,
    scope_epoch: context.scope_epoch,
    source_state: sourceState,
    permission: sourceState === 'not_authorized' ? 'not_authorized' : 'unknown',
    items: null,
    completeness: null,
    continuation: null,
    freshness: null,
    error: sourceState === 'not_authorized' ? null : error ?? internal,
  } as CollectionEnvelopeV1<T>
}

function oneFailure<T>(
  context: ServerReadContextV1,
  result: 'not_authorized' | 'error',
  error: typeof unavailable | typeof internal | typeof invalid | typeof revoked | null,
): ReadOneResponseV1<T> {
  return {
    contract_version: CONTRACT_VERSION,
    scope_epoch: context.scope_epoch,
    result,
    data: null,
    freshness: null,
    error: result === 'not_authorized' ? null : error ?? internal,
  } as ReadOneResponseV1<T>
}

function hasExpectedScope(
  value: { contract_version: string; scope_epoch: string },
  context: ServerReadContextV1,
): boolean {
  return value.contract_version === CONTRACT_VERSION && value.scope_epoch === context.scope_epoch
}

export class AuthorizedTelecomReadServiceV1 implements TelecomReadServiceV1 {
  readonly #repository: TelecomReadRepositoryV1
  readonly #authorizer: TelecomReadAuthorizerV1

  constructor(repository: TelecomReadRepositoryV1, authorizer: TelecomReadAuthorizerV1) {
    this.#repository = repository
    this.#authorizer = authorizer
  }

  async #collection<T>(
    operation: TelecomV1ReadOperation,
    context: ServerReadContextV1,
    input: CollectionInput,
    allowedKeys: readonly string[],
    validate: (input: Record<string, unknown>) => boolean,
    read: () => Promise<CollectionEnvelopeV1<T>>,
  ): Promise<CollectionEnvelopeV1<T>> {
    if (!validContext(context)) return collectionFailure(context, 'not_authorized', null)
    if (!validCollectionInput(input, allowedKeys) || !validate(input)) return collectionFailure(context, 'error', invalid)
    let authorized: boolean
    try {
      authorized = await this.#authorizer.authorize(context, operation)
    } catch {
      return collectionFailure(context, 'error', unavailable)
    }
    if (!authorized) return collectionFailure(context, 'not_authorized', null)
    try {
      const result = await read()
      return hasExpectedScope(result, context) ? result : collectionFailure(context, 'error', revoked)
    } catch {
      return collectionFailure(context, 'error', internal)
    }
  }

  async #one<T>(
    operation: TelecomV1ReadOperation,
    context: ServerReadContextV1,
    input: Record<string, unknown>,
    allowedKeys: readonly string[],
    id: string | null,
    read: () => Promise<ReadOneResponseV1<T>>,
  ): Promise<ReadOneResponseV1<T>> {
    if (!validContext(context)) return oneFailure(context, 'not_authorized', null)
    if (!closedInput(input, allowedKeys) || (id !== null && !validId(id))) return oneFailure(context, 'error', invalid)
    let authorized: boolean
    try {
      authorized = await this.#authorizer.authorize(context, operation)
    } catch {
      return oneFailure(context, 'error', unavailable)
    }
    if (!authorized) return oneFailure(context, 'not_authorized', null)
    try {
      const result = await read()
      return hasExpectedScope(result, context) ? result : oneFailure(context, 'error', revoked)
    } catch {
      return oneFailure(context, 'error', internal)
    }
  }

  customerSearch(context: ServerReadContextV1, input: CustomerSearchInputV1) {
    return this.#collection('customer.search', context, input,
      ['query', 'assigned_user_id', 'status', 'limit', 'continuation'],
      (value) => typeof value.query === 'string' && value.query.trim().length >= 1 && value.query.length <= 200 &&
        validOptionalIds(value, ['assigned_user_id']) && validEnum(value, 'status', ['active', 'inactive', 'archived']),
      () => this.#repository.customerSearch(context, input))
  }

  customerGet(context: ServerReadContextV1, input: { customer_id: string }) {
    return this.#one<CustomerCompanyV1>('customer.get', context, input, ['customer_id'], input.customer_id,
      () => this.#repository.customerGet(context, input))
  }

  customerSummary(context: ServerReadContextV1, input: { customer_id: string }) {
    return this.#one<CustomerSummaryV1>('customer.summary', context, input, ['customer_id'], input.customer_id,
      () => this.#repository.customerSummary(context, input))
  }

  contractList(context: ServerReadContextV1, input: ContractListInputV1) {
    return this.#collection<TelecomContractV1>('contract.list', context, input,
      ['customer_id', 'operator_id', 'assignee_id', 'status', 'commitment_from', 'commitment_to', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id', 'operator_id', 'assignee_id']) &&
        validEnum(value, 'status', ['draft', 'active', 'ended', 'cancelled']) &&
        validDateBounds(value, 'commitment_from', 'commitment_to'),
      () => this.#repository.contractList(context, input))
  }

  contractGet(context: ServerReadContextV1, input: { contract_id: string }) {
    return this.#one<TelecomContractV1>('contract.get', context, input, ['contract_id'], input.contract_id,
      () => this.#repository.contractGet(context, input))
  }

  serviceList(context: ServerReadContextV1, input: ServiceListInputV1) {
    return this.#collection<TelecomServiceV1>('service.list', context, input,
      ['customer_id', 'contract_id', 'operator_id', 'status', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id', 'contract_id', 'operator_id']) &&
        validEnum(value, 'status', ['pending', 'active', 'suspended', 'ended', 'cancelled']),
      () => this.#repository.serviceList(context, input))
  }

  lineList(context: ServerReadContextV1, input: LineListInputV1) {
    return this.#collection<TelecomLineV1>('line.list', context, input,
      ['customer_id', 'service_id', 'status', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id', 'service_id']) &&
        validEnum(value, 'status', ['pending', 'active', 'suspended', 'ended', 'cancelled']),
      () => this.#repository.lineList(context, input))
  }

  renewalList(context: ServerReadContextV1, input: WindowedListInputV1) {
    return this.#collection<RenewalItemV1>('renewal.list', context, input,
      ['customer_id', 'from', 'to', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id']) && validDateBounds(value, 'from', 'to'),
      () => this.#repository.renewalList(context, input))
  }

  permanenceList(context: ServerReadContextV1, input: WindowedListInputV1) {
    return this.#collection<PermanenceItemV1>('permanence.list', context, input,
      ['customer_id', 'from', 'to', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id']) && validDateBounds(value, 'from', 'to'),
      () => this.#repository.permanenceList(context, input))
  }

  taskList(context: ServerReadContextV1, input: TaskListInputV1) {
    return this.#collection<TaskItemV1>('task.list', context, input,
      ['customer_id', 'from', 'to', 'assignee_id', 'status', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id', 'assignee_id']) && validDateBounds(value, 'from', 'to') &&
        validEnum(value, 'status', ['pending', 'in_progress', 'completed', 'cancelled']),
      () => this.#repository.taskList(context, input))
  }

  meetingList(context: ServerReadContextV1, input: MeetingListInputV1) {
    return this.#collection<MeetingItemV1>('meeting.list', context, input,
      ['customer_id', 'from', 'to', 'assignee_id', 'status', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id', 'assignee_id']) && validDateBounds(value, 'from', 'to') &&
        validEnum(value, 'status', ['scheduled', 'completed', 'cancelled', 'no_show']),
      () => this.#repository.meetingList(context, input))
  }

  activityList(context: ServerReadContextV1, input: WindowedListInputV1) {
    return this.#collection<ActivityItemV1>('activity.list', context, input,
      ['customer_id', 'from', 'to', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id']) && validDateBounds(value, 'from', 'to'),
      () => this.#repository.activityList(context, input))
  }

  opportunityList(context: ServerReadContextV1, input: OpportunityListInputV1) {
    return this.#collection<OpportunityItemV1>('opportunity.list', context, input,
      ['customer_id', 'from', 'to', 'owner_id', 'status', 'limit', 'continuation'],
      (value) => validOptionalIds(value, ['customer_id', 'owner_id']) && validDateBounds(value, 'from', 'to') &&
        validEnum(value, 'status', ['open', 'won', 'lost', 'cancelled']),
      () => this.#repository.opportunityList(context, input))
  }

  dashboardGet(context: ServerReadContextV1, input: { audience: 'personal' | 'team' | 'workspace' }) {
    if (!closedInput(input, ['audience']) || !validEnum(input, 'audience', ['personal', 'team', 'workspace']) || input.audience === undefined) {
      return Promise.resolve(oneFailure<DashboardV1>(context, 'error', invalid))
    }
    return this.#one<DashboardV1>('dashboard.get', context, input, ['audience'], null,
      () => this.#repository.dashboardGet(context, input))
  }
}
