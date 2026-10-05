/** Descriptor-only projection of W1 telecom.v1. No executable or live adapters. */
export const TELECOM_CAPABILITY_CATALOG_VERSION = 'w3.telecom-capabilities.v2' as const
export type TelecomInputField =
  | { type: 'string'; minLength: number; maxLength: number; enum?: readonly string[]; format?: 'date'; nullable?: true }
  | { type: 'integer'; minimum: number; maximum: number }
export type TelecomInputSchema = {
  type: 'object'; properties: Readonly<Record<string, TelecomInputField>>
  required: readonly string[]; additionalProperties: false
}
export type TelecomCapabilityDescriptor = {
  name: string; operation: string; serviceMethod: string; description: string
  sourceContract: 'telecom.v1'
  implementationState: 'published_contract_no_live_adapter'
  availability: 'published_contract_no_live_adapter'
  inputSchema: TelecomInputSchema
  outputSchema: { sourceProjection: 'w1_contract_dto'; ref: string }
  authorization: { operation: string; authorizer: 'TelecomReadAuthorizerV1'; resourceAuthorization: 'required' }
  tenantScope: { source: 'server_context'; modelMayChooseWorkspace: false }
  accessClass: 'READ'; confirmationPolicy: 'none'; idempotency: 'not_applicable'
  errors: readonly string[]
}
const id = { type: 'string', minLength: 16, maxLength: 160 } as const
const date = { type: 'string', minLength: 10, maxLength: 10, format: 'date' } as const
const page = {
  limit: { type: 'integer', minimum: 1, maximum: 100 },
  continuation: { type: 'string', minLength: 16, maxLength: 256, nullable: true },
} as const
const window = { customer_id: id, from: date, to: date }
const status = (...values: string[]): TelecomInputField => ({ type: 'string', minLength: 1, maxLength: Math.max(...values.map((v) => v.length)), enum: values })
const errors = ['unauthorized', 'not_found', 'forbidden', 'validation', 'conflict', 'rate_limited', 'temporary_unavailable', 'stale', 'access_revoked', 'internal_safe'] as const
function descriptor(operation: string, serviceMethod: string, description: string, properties: Record<string, TelecomInputField>, required: string[], output: string): TelecomCapabilityDescriptor {
  return {
    name: `crm.${operation}`, operation, serviceMethod, description,
    sourceContract: 'telecom.v1', implementationState: 'published_contract_no_live_adapter', availability: 'published_contract_no_live_adapter',
    inputSchema: { type: 'object', properties, required, additionalProperties: false },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: `telecom.v1#${output}` },
    authorization: { operation, authorizer: 'TelecomReadAuthorizerV1', resourceAuthorization: 'required' },
    tenantScope: { source: 'server_context', modelMayChooseWorkspace: false },
    accessClass: 'READ', confirmationPolicy: 'none', idempotency: 'not_applicable', errors,
  }
}
function list(operation: string, method: string, description: string, properties: Record<string, TelecomInputField>, output: string, required: string[] = []): TelecomCapabilityDescriptor {
  return descriptor(operation, method, description, { ...page, ...properties }, ['limit', 'continuation', ...required], `CollectionEnvelopeV1<${output}>`)
}
export const TELECOM_CAPABILITY_CATALOG: readonly TelecomCapabilityDescriptor[] = [
  list('customer.search', 'customerSearch', 'Search authorized customers by bounded query, assigned user and status.', { query: { type: 'string', minLength: 1, maxLength: 200 }, assigned_user_id: id, status: status('active', 'inactive', 'archived') }, 'CustomerCompanyV1', ['query']),
  descriptor('customer.get', 'customerGet', 'Read one authorized customer; protected fields remain masked.', { customer_id: id }, ['customer_id'], 'ReadOneResponseV1<CustomerCompanyV1>'),
  descriptor('customer.summary', 'customerSummary', 'Read a customer summary with independent collection completeness and attention.', { customer_id: id }, ['customer_id'], 'ReadOneResponseV1<CustomerSummaryV1>'),
  list('contract.list', 'contractList', 'List authorized contracts with commitment date bounds.', { customer_id: id, operator_id: id, assignee_id: id, status: status('draft', 'active', 'ended', 'cancelled'), commitment_from: date, commitment_to: date }, 'TelecomContractV1'),
  descriptor('contract.get', 'contractGet', 'Read one authorized telecom contract.', { contract_id: id }, ['contract_id'], 'ReadOneResponseV1<TelecomContractV1>'),
  list('service.list', 'serviceList', 'List services separately from their lines.', { customer_id: id, contract_id: id, operator_id: id, status: status('pending', 'active', 'suspended', 'ended', 'cancelled') }, 'TelecomServiceV1'),
  list('line.list', 'lineList', 'List authorized lines with protected identifiers.', { customer_id: id, service_id: id, status: status('pending', 'active', 'suspended', 'ended', 'cancelled') }, 'TelecomLineV1'),
  list('renewal.list', 'renewalList', 'List renewal items within date bounds.', window, 'RenewalItemV1'),
  list('permanence.list', 'permanenceList', 'List permanence items within date bounds.', window, 'PermanenceItemV1'),
  list('task.list', 'taskList', 'List tasks by customer, assignee, date and status.', { ...window, assignee_id: id, status: status('pending', 'in_progress', 'completed', 'cancelled') }, 'TaskItemV1'),
  list('meeting.list', 'meetingList', 'List meetings by customer, assignee, date and status.', { ...window, assignee_id: id, status: status('scheduled', 'completed', 'cancelled', 'no_show') }, 'MeetingItemV1'),
  list('activity.list', 'activityList', 'List authorized safe activity summaries within date bounds.', window, 'ActivityItemV1'),
  list('opportunity.list', 'opportunityList', 'List opportunities by customer, owner, date and status.', { ...window, owner_id: id, status: status('open', 'won', 'lost', 'cancelled') }, 'OpportunityItemV1'),
  descriptor('dashboard.get', 'dashboardGet', 'Read independently authorized dashboard sections; audience never chooses a workspace.', { audience: status('personal', 'team', 'workspace') }, ['audience'], 'ReadOneResponseV1<DashboardV1>'),
]
export function telecomCapability(name: string): TelecomCapabilityDescriptor | null {
  return TELECOM_CAPABILITY_CATALOG.find((candidate) => candidate.name === name) ?? null
}
