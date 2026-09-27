import type {
  CollectionEnvelopeV1,
  CustomerCompanyV1,
  CustomerSearchInputV1,
  ReadOneResponseV1,
  ServerReadContextV1,
} from '../contracts/telecom-v1'
import type { TelecomCursorBindingV1, TelecomCursorCodecV1 } from './telecom-cursor-v1'
import type { TelecomReadRepositoryV1 } from './telecom-read-service-v1'
import { isStrictInstantV1 } from './telecom-runtime-v1.ts'

export interface TelecomRpcClientV1 {
  rpc(name: string, parameters: Record<string, unknown>): PromiseLike<Readonly<{
    data: unknown
    error: unknown
  }>>
}

type CustomerRow = Readonly<{
  id: string
  account_kind: 'legal_entity' | 'sole_trader'
  legal_name: string
  trade_name: string | null
  lifecycle: 'lead' | 'prospect' | 'customer' | 'former_customer'
  status: 'active' | 'inactive' | 'archived'
  assigned_user_id: string | null
  assigned_user_name: string | null
  primary_contact_id: string | null
  primary_contact_name: string | null
}>

const VERSION = 'telecom.v1' as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACCOUNT_KINDS = ['legal_entity', 'sole_trader'] as const
const LIFECYCLES = ['lead', 'prospect', 'customer', 'former_customer'] as const
const STATUSES = ['active', 'inactive', 'archived'] as const

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return Object.keys(value).sort().join(',') === [...fields].sort().join(',')
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(value)
}

function nullableText(value: unknown, max: number): value is string | null {
  return value === null || text(value, max)
}

function nullableUuid(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && UUID.test(value))
}

function oneOf<const Values extends readonly string[]>(value: unknown, values: Values): value is Values[number] {
  return typeof value === 'string' && values.includes(value)
}

function parseCustomerRow(value: unknown): CustomerRow | null {
  if (!record(value) || !exact(value, [
    'id', 'account_kind', 'legal_name', 'trade_name', 'lifecycle', 'status',
    'assigned_user_id', 'assigned_user_name', 'primary_contact_id', 'primary_contact_name',
  ])) return null
  if (typeof value.id !== 'string' || !UUID.test(value.id)
    || !oneOf(value.account_kind, ACCOUNT_KINDS)
    || !text(value.legal_name, 200)
    || !nullableText(value.trade_name, 200)
    || !oneOf(value.lifecycle, LIFECYCLES)
    || !oneOf(value.status, STATUSES)
    || !nullableUuid(value.assigned_user_id)
    || !nullableText(value.assigned_user_name, 160)
    || !nullableUuid(value.primary_contact_id)
    || !nullableText(value.primary_contact_name, 160)
    || (value.assigned_user_id === null) !== (value.assigned_user_name === null)
    || (value.primary_contact_id === null) !== (value.primary_contact_name === null)) return null
  return Object.freeze({
    id: value.id,
    account_kind: value.account_kind,
    legal_name: value.legal_name,
    trade_name: value.trade_name,
    lifecycle: value.lifecycle,
    status: value.status,
    assigned_user_id: value.assigned_user_id,
    assigned_user_name: value.assigned_user_name,
    primary_contact_id: value.primary_contact_id,
    primary_contact_name: value.primary_contact_name,
  })
}

function projectCustomer(row: CustomerRow, context: ServerReadContextV1): CustomerCompanyV1 {
  return {
    contract_version: VERSION,
    scope_epoch: context.scope_epoch,
    id: row.id,
    account_kind: row.account_kind,
    legal_name: row.legal_name,
    trade_name: row.trade_name,
    tax_identifier: { field_class: 'tax_identifier', visibility: 'hidden' },
    lifecycle: row.lifecycle,
    status: row.status,
    assigned_user: row.assigned_user_id === null ? null : {
      kind: 'user', id: row.assigned_user_id, display_name: row.assigned_user_name!,
    },
    primary_contact: row.primary_contact_id === null ? null : {
      kind: 'contact', id: row.primary_contact_id, display_name: row.primary_contact_name!,
    },
    capabilities: [],
  }
}

function unavailableCollection<T>(context: ServerReadContextV1): CollectionEnvelopeV1<T> {
  return {
    contract_version: VERSION,
    scope_epoch: context.scope_epoch,
    source_state: 'unavailable',
    permission: 'unknown',
    items: null,
    completeness: null,
    continuation: null,
    freshness: null,
    error: null,
  }
}

function unavailableOne<T>(context: ServerReadContextV1): ReadOneResponseV1<T> {
  return {
    contract_version: VERSION,
    scope_epoch: context.scope_epoch,
    result: 'unavailable',
    data: null,
    freshness: null,
    error: null,
  }
}

/** Server-only repository. It is intentionally not registered in an HTTP route. */
export class SupabaseTelecomReadRepositoryV1 implements TelecomReadRepositoryV1 {
  readonly #client: TelecomRpcClientV1
  readonly #cursor: TelecomCursorCodecV1
  readonly #now: () => string

  constructor(client: TelecomRpcClientV1, cursor: TelecomCursorCodecV1, now: () => string) {
    this.#client = client
    this.#cursor = cursor
    this.#now = now
  }

  #binding(context: ServerReadContextV1, input: CustomerSearchInputV1): TelecomCursorBindingV1 {
    return {
      actorId: context.actor_id,
      workspaceId: context.workspace_id,
      scopeEpoch: context.scope_epoch,
      operation: 'customer.search',
      filter: JSON.stringify([input.query.trim(), input.status ?? null, input.assigned_user_id ?? null, input.limit]),
    }
  }

  async customerSearch(context: ServerReadContextV1, input: CustomerSearchInputV1): Promise<unknown> {
    const binding = this.#binding(context, input)
    const cursor = input.continuation === null ? null : await this.#cursor.consume(binding, input.continuation)
    if (input.continuation !== null && cursor === null) throw new Error('invalid customer continuation')
    const response = await this.#client.rpc('telecom_v1_customer_search_rows', {
      p_actor_id: context.actor_id,
      p_workspace_id: context.workspace_id,
      p_query: input.query,
      p_status: input.status ?? null,
      p_assigned_user_id: input.assigned_user_id ?? null,
      p_limit: input.limit,
      p_after_created_at: cursor?.createdAt ?? null,
      p_after_id: cursor?.id ?? null,
    })
    if (response.error !== null || !record(response.data) || !exact(response.data, ['rows', 'has_more', 'next_created_at', 'next_id'])) {
      throw new Error('customer search unavailable')
    }
    if (!Array.isArray(response.data.rows) || response.data.rows.length > input.limit || typeof response.data.has_more !== 'boolean') {
      throw new Error('invalid customer search result')
    }
    const rows = response.data.rows.map(parseCustomerRow)
    if (rows.some((row) => row === null)) throw new Error('invalid customer row')
    const hasMore = response.data.has_more
    const nextCreatedAt = response.data.next_created_at
    const nextId = response.data.next_id
    if ((hasMore && rows.length === 0)
      || hasMore !== (nextCreatedAt !== null && nextId !== null)
      || nextCreatedAt !== null && !isStrictInstantV1(nextCreatedAt)
      || nextId !== null && (typeof nextId !== 'string' || !UUID.test(nextId))) {
      throw new Error('invalid customer continuation row')
    }
    const continuation = hasMore
      ? await this.#cursor.issue(binding, { createdAt: nextCreatedAt as string, id: nextId as string })
      : null
    const asOf = this.#now()
    if (!isStrictInstantV1(asOf)) throw new Error('invalid repository clock')
    return {
      contract_version: VERSION,
      scope_epoch: context.scope_epoch,
      source_state: 'available',
      permission: 'authorized',
      items: (rows as CustomerRow[]).map((row) => projectCustomer(row, context)),
      completeness: hasMore ? { kind: 'partial', has_more: true } : { kind: 'complete' },
      continuation,
      freshness: { kind: 'fresh', as_of: asOf },
      error: null,
    }
  }

  async customerGet(context: ServerReadContextV1, input: { customer_id: string }): Promise<unknown> {
    const response = await this.#client.rpc('telecom_v1_customer_get_row', {
      p_actor_id: context.actor_id,
      p_workspace_id: context.workspace_id,
      p_customer_id: input.customer_id,
    })
    if (response.error !== null) throw new Error('customer get unavailable')
    const asOf = this.#now()
    if (!isStrictInstantV1(asOf)) throw new Error('invalid repository clock')
    if (response.data === null) {
      return { contract_version: VERSION, scope_epoch: context.scope_epoch, result: 'not_found', data: null, freshness: null, error: null }
    }
    const row = parseCustomerRow(response.data)
    if (row === null) throw new Error('invalid customer row')
    return {
      contract_version: VERSION,
      scope_epoch: context.scope_epoch,
      result: 'found',
      data: projectCustomer(row, context),
      freshness: { kind: 'fresh', as_of: asOf },
      error: null,
    }
  }

  async customerSummary(context: ServerReadContextV1, input: { customer_id: string }): Promise<unknown> {
    const response = await this.#client.rpc('telecom_v1_customer_summary', {
      p_actor_id: context.actor_id,
      p_workspace_id: context.workspace_id,
      p_customer_id: input.customer_id,
      p_scope_epoch: context.scope_epoch,
    })
    if (response.error !== null) throw new Error('customer summary unavailable')
    const asOf = this.#now()
    if (!isStrictInstantV1(asOf)) throw new Error('invalid repository clock')
    if (response.data === null) {
      return { contract_version: VERSION, scope_epoch: context.scope_epoch, result: 'not_found', data: null, freshness: null, error: null }
    }
    return {
      contract_version: VERSION,
      scope_epoch: context.scope_epoch,
      result: 'found',
      data: response.data,
      freshness: { kind: 'fresh', as_of: asOf },
      error: null,
    }
  }
  contractList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  contractGet(context: ServerReadContextV1) { return Promise.resolve(unavailableOne(context)) }
  serviceList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  lineList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  renewalList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  permanenceList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  taskList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  meetingList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  activityList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  opportunityList(context: ServerReadContextV1) { return Promise.resolve(unavailableCollection(context)) }
  dashboardGet(context: ServerReadContextV1) { return Promise.resolve(unavailableOne(context)) }
}
