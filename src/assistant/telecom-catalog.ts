import type { AccessClass, ConfirmationPolicy, ObjectSchema } from './contracts.js'

export const TELECOM_CAPABILITY_CATALOG_VERSION = 'w3.telecom-capabilities.v1' as const

export type TelecomCapabilityAvailability =
  | 'mapped_no_adapter'
  | 'blocked_on_w1_write_contract'

export type TelecomOutputSchemaRef =
  | 'telecom.v0#CustomerCompanyV0'
  | 'telecom.v0#CustomerCompanyV0[]'
  | 'telecom.v0#TelecomContractV0'
  | 'telecom.v0#TelecomContractV0[]'
  | 'telecom.v0#ServiceLineV0[]'
  | 'telecom.v0#DashboardReadModelV0'
  | 'telecom.v0#DashboardItemV0[]'
  | 'telecom.write-contract#Task'
  | 'telecom.write-contract#Meeting'

export type TelecomCapabilityDescriptor = {
  name: string
  description: string
  sourceContract: 'telecom.v0' | 'unpublished'
  availability: TelecomCapabilityAvailability
  inputSchema: ObjectSchema
  outputSchema: {
    sourceProjection: 'w1_contract_dto'
    ref: TelecomOutputSchemaRef
  }
  authorization: {
    permission: string
    resourceAuthorization: 'required'
  }
  tenantScope: {
    source: 'server_context'
    modelMayChooseWorkspace: false
  }
  accessClass: AccessClass
  confirmationPolicy: ConfirmationPolicy
  idempotency: 'not_applicable' | 'required'
  errors: readonly [
    'INVALID_INPUT',
    'FORBIDDEN',
    'NOT_FOUND',
    'AMBIGUOUS',
    'PARTIAL',
    'UNAVAILABLE',
  ]
}

const errors = [
  'INVALID_INPUT',
  'FORBIDDEN',
  'NOT_FOUND',
  'AMBIGUOUS',
  'PARTIAL',
  'UNAVAILABLE',
] as const

const tenantScope = {
  source: 'server_context',
  modelMayChooseWorkspace: false,
} as const

const id = { type: 'string', minLength: 16, maxLength: 160 } as const
const query = { type: 'string', minLength: 1, maxLength: 200 } as const
const cursor = { type: 'string', minLength: 16, maxLength: 256 } as const
const limit = { type: 'number', minimum: 1, maximum: 100 } as const
const isoDate = { type: 'string', minLength: 10, maxLength: 10 } as const

function readCapability(
  descriptor: Omit<TelecomCapabilityDescriptor, 'sourceContract' | 'availability' | 'tenantScope' | 'accessClass' | 'confirmationPolicy' | 'idempotency' | 'errors'>,
): TelecomCapabilityDescriptor {
  return {
    ...descriptor,
    sourceContract: 'telecom.v0',
    availability: 'mapped_no_adapter',
    tenantScope,
    accessClass: 'READ',
    confirmationPolicy: 'none',
    idempotency: 'not_applicable',
    errors,
  }
}

function blockedWriteCapability(
  descriptor: Omit<TelecomCapabilityDescriptor, 'sourceContract' | 'availability' | 'tenantScope' | 'accessClass' | 'confirmationPolicy' | 'idempotency' | 'errors'>,
): TelecomCapabilityDescriptor {
  return {
    ...descriptor,
    sourceContract: 'unpublished',
    availability: 'blocked_on_w1_write_contract',
    tenantScope,
    accessClass: 'SAFE_WRITE',
    confirmationPolicy: 'none',
    idempotency: 'required',
    errors,
  }
}

export const TELECOM_CAPABILITY_CATALOG: readonly TelecomCapabilityDescriptor[] = [
  readCapability({
    name: 'crm.customer.search',
    description: 'Search customers by bounded name or tax identifier within the server-resolved workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        query,
        assignedUserId: id,
        status: { type: 'string', maxLength: 16, enum: ['active', 'inactive', 'archived'] },
        limit,
        cursor,
      },
      required: ['query'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#CustomerCompanyV0[]' },
    authorization: { permission: 'crm.customer.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.customer.get',
    description: 'Read one authorized customer using an opaque customer reference.',
    inputSchema: {
      type: 'object',
      properties: { customerId: id },
      required: ['customerId'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#CustomerCompanyV0' },
    authorization: { permission: 'crm.customer.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.customer.summary',
    description: 'Compose an authorized customer summary from published customer, contract and service read models.',
    inputSchema: {
      type: 'object',
      properties: { customerId: id },
      required: ['customerId'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#CustomerCompanyV0' },
    authorization: { permission: 'crm.customer.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.contract.search',
    description: 'Search contracts using bounded customer, operator, assignee, lifecycle and date filters.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: id,
        operatorId: id,
        assigneeId: id,
        lifecycle: { type: 'string', maxLength: 16, enum: ['draft', 'active', 'renewal_due', 'ended', 'cancelled'] },
        commitmentFrom: isoDate,
        commitmentTo: isoDate,
        limit,
        cursor,
      },
      required: [],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#TelecomContractV0[]' },
    authorization: { permission: 'crm.contract.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.contract.get',
    description: 'Read one authorized telecom contract using an opaque contract reference.',
    inputSchema: {
      type: 'object',
      properties: { contractId: id },
      required: ['contractId'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#TelecomContractV0' },
    authorization: { permission: 'crm.contract.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.commitment.expiring',
    description: 'List contracts whose published commitment end date falls inside a bounded date window.',
    inputSchema: {
      type: 'object',
      properties: { from: isoDate, to: isoDate, customerId: id, limit, cursor },
      required: ['from', 'to'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#TelecomContractV0[]' },
    authorization: { permission: 'crm.contract.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.renewal.upcoming',
    description: 'List contracts with a published renewal window intersecting a bounded date range.',
    inputSchema: {
      type: 'object',
      properties: { from: isoDate, to: isoDate, customerId: id, limit, cursor },
      required: ['from', 'to'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#TelecomContractV0[]' },
    authorization: { permission: 'crm.contract.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.service.search',
    description: 'List authorized services or lines using published telecom.v0 filters.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: id,
        contractId: id,
        operatorId: id,
        kind: { type: 'string', maxLength: 7, enum: ['service', 'line'] },
        status: { type: 'string', maxLength: 10, enum: ['pending', 'active', 'suspended', 'cancelled'] },
        limit,
        cursor,
      },
      required: [],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#ServiceLineV0[]' },
    authorization: { permission: 'crm.service.read', resourceAuthorization: 'required' },
  }),
  readCapability({
    name: 'crm.dashboard.get',
    description: 'Read the complete published dashboard with independent section freshness and errors.',
    inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#DashboardReadModelV0' },
    authorization: { permission: 'crm.dashboard.read', resourceAuthorization: 'required' },
  }),
  ...(['task', 'meeting', 'opportunity'] as const).map((kind): TelecomCapabilityDescriptor => readCapability({
    name: `crm.${kind}.list`,
    description: `Read the ${kind} section from the published dashboard without fabricating missing detail.`,
    inputSchema: {
      type: 'object',
      properties: { dueFrom: isoDate, dueTo: isoDate, customerId: id, limit },
      required: [],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.v0#DashboardItemV0[]' },
    authorization: { permission: `crm.${kind}.read`, resourceAuthorization: 'required' },
  })),
  blockedWriteCapability({
    name: 'crm.task.create',
    description: 'Create a task only after W1 publishes a canonical write contract and adapter boundary.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: id,
        title: { type: 'string', minLength: 1, maxLength: 200 },
        dueAt: { type: 'string', minLength: 20, maxLength: 40 },
      },
      required: ['title', 'dueAt'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.write-contract#Task' },
    authorization: { permission: 'crm.task.create', resourceAuthorization: 'required' },
  }),
  blockedWriteCapability({
    name: 'crm.meeting.create',
    description: 'Create a meeting only after W1 publishes a canonical write and participant contract.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: id,
        title: { type: 'string', minLength: 1, maxLength: 200 },
        startsAt: { type: 'string', minLength: 20, maxLength: 40 },
        durationMinutes: { type: 'number', minimum: 5, maximum: 480 },
      },
      required: ['title', 'startsAt', 'durationMinutes'],
      additionalProperties: false,
    },
    outputSchema: { sourceProjection: 'w1_contract_dto', ref: 'telecom.write-contract#Meeting' },
    authorization: { permission: 'crm.meeting.create', resourceAuthorization: 'required' },
  }),
] as const

export function telecomCapability(name: string): TelecomCapabilityDescriptor | null {
  return TELECOM_CAPABILITY_CATALOG.find((candidate) => candidate.name === name) ?? null
}
