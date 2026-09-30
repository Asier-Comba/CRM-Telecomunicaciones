import type {
  ActivityItemV1,
  CustomerCompanyV1,
  MeetingItemV1,
  OpportunityItemV1,
  PermanenceItemV1,
  RenewalItemV1,
  TaskItemV1,
  TelecomContractV1,
  TelecomLineV1,
  TelecomServiceV1,
} from '@/lib/contracts/telecom-v1'

export const PREVIEW_SCOPE_EPOCH = 'preview-scope-2026-09-30'
export const PREVIEW_AS_OF = '2026-09-30T07:00:00Z'

const ref = (kind: 'customer' | 'contract' | 'service' | 'operator' | 'plan' | 'user' | 'opportunity_stage', id: string, display_name: string) => ({ kind, id, display_name } as const)
const hiddenTax = { field_class: 'tax_identifier', visibility: 'hidden' } as const
const hiddenContract = { field_class: 'contract_reference', visibility: 'hidden' } as const
const hiddenLine = { field_class: 'line_identifier', visibility: 'hidden' } as const

export const previewCustomers = [
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'cust_demo_norte_0001', account_kind: 'legal_entity', legal_name: 'Empresa Norte Telecom SL', trade_name: 'Norte Telecom', tax_identifier: hiddenTax, lifecycle: 'customer', status: 'active', assigned_user: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), primary_contact: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'cust_demo_bilbao_002', account_kind: 'legal_entity', legal_name: 'Bilbao Industrial Demo SL', trade_name: null, tax_identifier: hiddenTax, lifecycle: 'customer', status: 'active', assigned_user: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), primary_contact: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'cust_demo_costa_0003', account_kind: 'legal_entity', legal_name: 'Costa Digital Ejemplo SL', trade_name: 'Costa Digital', tax_identifier: hiddenTax, lifecycle: 'prospect', status: 'active', assigned_user: ref('user', 'user_demo_iker_0002', 'Comercial Demo B'), primary_contact: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'cust_demo_euskal_004', account_kind: 'sole_trader', legal_name: 'Euskal Servicios Demostración', trade_name: null, tax_identifier: hiddenTax, lifecycle: 'former_customer', status: 'inactive', assigned_user: null, primary_contact: null, capabilities: [] },
  ...[
    ['cust_demo_norte_log_05', 'Norte Logística Demo SL', 'Norte Logística'],
    ['cust_demo_delta_00006', 'Delta Ingeniería Demo SL', 'Delta Demo'],
    ['cust_demo_orbita_0007', 'Órbita Talleres Demo SL', 'Órbita Demo'],
    ['cust_demo_lumen_00008', 'Lumen Tecnología Demo SL', 'Lumen Demo'],
    ['cust_demo_vega_000009', 'Vega Consultoría Demo SL', 'Vega Demo'],
    ['cust_demo_parcial_010', 'Horizonte Datos Parciales Demo SL', null],
  ].map(([id, legal_name, trade_name], index): CustomerCompanyV1 => ({
    contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: id!,
    account_kind: 'legal_entity', legal_name: legal_name!, trade_name, tax_identifier: hiddenTax,
    lifecycle: index === 4 ? 'prospect' : 'customer', status: 'active',
    assigned_user: index === 5 ? null : ref('user', index % 2 ? 'user_demo_iker_0002' : 'user_demo_marta_001', index % 2 ? 'Comercial Demo B' : 'Comercial Demo A'),
    primary_contact: null, capabilities: [],
  })),
] as const satisfies readonly CustomerCompanyV1[]

const customer = (id: string) => {
  const item = previewCustomers.find(candidate => candidate.id === id)
  if (!item) throw new Error('preview_customer_missing')
  return ref('customer', item.id, item.legal_name)
}
const vodafone = ref('operator', 'operator_demo_vf_001', 'Vodafone Empresas')
const otherOperator = ref('operator', 'operator_demo_alt_02', 'Operador Demo Norte')

export const previewContracts = [
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'contract_demo_norte_01', customer: customer('cust_demo_norte_0001'), operator: vodafone, plan: ref('plan', 'plan_demo_empresa_001', 'Empresa Pro Demo'), external_reference: hiddenContract, status: 'active', start_date: '2025-10-15', signed_date: '2025-10-08', end_date: null, cancelled_at: null, assigned_user: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'contract_demo_bilbao02', customer: customer('cust_demo_bilbao_002'), operator: vodafone, plan: ref('plan', 'plan_demo_flex_0002', 'Flexible Empresa Demo'), external_reference: hiddenContract, status: 'active', start_date: '2024-11-03', signed_date: '2024-10-25', end_date: null, cancelled_at: null, assigned_user: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'contract_demo_costa_003', customer: customer('cust_demo_costa_0003'), operator: otherOperator, plan: null, external_reference: hiddenContract, status: 'draft', start_date: '2026-10-20', signed_date: null, end_date: null, cancelled_at: null, assigned_user: ref('user', 'user_demo_iker_0002', 'Comercial Demo B'), capabilities: [] },
  ...previewCustomers.slice(4, 8).map((item, index): TelecomContractV1 => ({
    contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: `contract_demo_extra_0${index}`,
    customer: customer(item.id), operator: index % 2 ? vodafone : otherOperator, plan: null,
    external_reference: hiddenContract, status: 'active', start_date: '2026-03-01', signed_date: null,
    end_date: null, cancelled_at: null, assigned_user: item.assigned_user, capabilities: [],
  })),
] as const satisfies readonly TelecomContractV1[]

const contract = (id: string, name: string) => ref('contract', id, name)
export const previewServices = [
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'service_demo_norte_fiber', customer: customer('cust_demo_norte_0001'), contract: contract('contract_demo_norte_01', 'Contrato Norte'), operator: vodafone, plan: ref('plan', 'plan_demo_fiber_001', 'Fibra Empresa Demo'), service_kind: 'fiber', display_name: 'Fibra sede principal', status: 'active', activated_on: '2025-10-15', ended_on: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'service_demo_norte_mobile', customer: customer('cust_demo_norte_0001'), contract: contract('contract_demo_norte_01', 'Contrato Norte'), operator: vodafone, plan: ref('plan', 'plan_demo_mobile_01', 'Móvil Empresa Demo'), service_kind: 'mobile', display_name: 'Flota móvil', status: 'active', activated_on: '2025-10-15', ended_on: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'service_demo_bilbao_mobile', customer: customer('cust_demo_bilbao_002'), contract: contract('contract_demo_bilbao02', 'Contrato Bilbao'), operator: vodafone, plan: ref('plan', 'plan_demo_mobile_02', 'Móvil Flexible Demo'), service_kind: 'mobile', display_name: 'Líneas comerciales', status: 'active', activated_on: '2024-11-03', ended_on: null, capabilities: [] },
  ...previewContracts.slice(3).map((item, index): TelecomServiceV1 => ({
    contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: `service_demo_extra_0${index}`,
    customer: item.customer, contract: contract(item.id, 'Contrato demo'), operator: item.operator,
    plan: null, service_kind: index % 2 ? 'fiber' : 'mobile', display_name: index % 2 ? 'Conectividad sede demo' : 'Flota comercial demo',
    status: 'active', activated_on: '2026-03-01', ended_on: null, capabilities: [],
  })),
] as const satisfies readonly TelecomServiceV1[]

const service = (id: string, name: string) => ref('service', id, name)
export const previewLines = [
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'line_demo_norte_0001', service: service('service_demo_norte_mobile', 'Flota móvil'), identifier: hiddenLine, status: 'active', activated_on: '2025-10-15', ended_on: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'line_demo_norte_0002', service: service('service_demo_norte_mobile', 'Flota móvil'), identifier: hiddenLine, status: 'active', activated_on: '2025-10-15', ended_on: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'line_demo_norte_0003', service: service('service_demo_norte_mobile', 'Flota móvil'), identifier: hiddenLine, status: 'suspended', activated_on: '2025-10-15', ended_on: null, capabilities: [] },
  { contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: 'line_demo_bilbao_001', service: service('service_demo_bilbao_mobile', 'Líneas comerciales'), identifier: hiddenLine, status: 'active', activated_on: '2024-11-03', ended_on: null, capabilities: [] },
  ...Array.from({ length: 12 }, (_, index): TelecomLineV1 => ({
    contract_version: 'telecom.v1', scope_epoch: PREVIEW_SCOPE_EPOCH, id: `line_demo_extra_000${index}`,
    service: service(index < 8 ? 'service_demo_extra_00' : 'service_demo_extra_02', 'Flota comercial demo'),
    identifier: hiddenLine, status: 'active', activated_on: '2026-03-01', ended_on: null, capabilities: [],
  })),
] as const satisfies readonly TelecomLineV1[]

export const previewTasks = [
  { kind: 'task', id: 'task_demo_norte_call_01', customer: customer('cust_demo_norte_0001'), title: 'Revisar renovación de la flota móvil', destination: { kind: 'customer', customer_id: 'cust_demo_norte_0001' }, capabilities: [], status: 'pending', priority: 'high', due_at: '2026-09-30T09:00:00Z', assignee: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), version: 1 },
  { kind: 'task', id: 'task_demo_bilbao_follow', customer: customer('cust_demo_bilbao_002'), title: 'Llamar para validar necesidades de datos', destination: { kind: 'customer', customer_id: 'cust_demo_bilbao_002' }, capabilities: [], status: 'in_progress', priority: 'normal', due_at: '2026-10-01T08:30:00Z', assignee: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), version: 2 },
] as const satisfies readonly TaskItemV1[]

export const previewMeetings = [
  { kind: 'meeting', id: 'meeting_demo_costa_001', customer: customer('cust_demo_costa_0003'), title: 'Reunión de propuesta telecom', destination: { kind: 'customer', customer_id: 'cust_demo_costa_0003' }, capabilities: [], status: 'scheduled', starts_at: '2026-09-30T14:00:00Z', ends_at: '2026-09-30T14:45:00Z', all_day: false, timezone: 'Europe/Madrid', channel: 'video', assignee: ref('user', 'user_demo_iker_0002', 'Comercial Demo B') },
] as const satisfies readonly MeetingItemV1[]

export const previewRenewals = [
  { kind: 'renewal', id: 'renewal_demo_norte_01', customer: customer('cust_demo_norte_0001'), title: 'Renovación del contrato Norte', destination: { kind: 'contract', contract_id: 'contract_demo_norte_01' }, capabilities: [], contract: contract('contract_demo_norte_01', 'Contrato Norte'), status: 'upcoming', target_on: '2026-10-15', opens_on: '2026-09-15', closes_on: '2026-10-31' },
] as const satisfies readonly RenewalItemV1[]

export const previewPermanences = [
  { kind: 'permanence', id: 'permanence_demo_bilbao', customer: customer('cust_demo_bilbao_002'), title: 'Fin de permanencia móvil', destination: { kind: 'contract', contract_id: 'contract_demo_bilbao02' }, capabilities: [], contract: contract('contract_demo_bilbao02', 'Contrato Bilbao'), service: service('service_demo_bilbao_mobile', 'Líneas comerciales'), status: 'active', starts_on: '2024-11-03', ends_on: '2026-10-03', reason_code: 'discount' },
] as const satisfies readonly PermanenceItemV1[]

export const previewOpportunities = [
  { kind: 'opportunity', id: 'opportunity_demo_costa', customer: customer('cust_demo_costa_0003'), title: 'Migración de conectividad y móvil', destination: { kind: 'opportunity', opportunity_id: 'opportunity_demo_costa' }, capabilities: [], stage: ref('opportunity_stage', 'stage_demo_proposal_01', 'Propuesta'), status: 'open', next_follow_up_at: '2026-10-02T08:00:00Z', follow_up_state: 'scheduled', amount: { minor_units: 184500, currency: 'EUR' }, owner: ref('user', 'user_demo_iker_0002', 'Comercial Demo B') },
  { kind: 'opportunity', id: 'opportunity_demo_norte', customer: customer('cust_demo_norte_0001'), title: 'Ampliación de líneas', destination: { kind: 'opportunity', opportunity_id: 'opportunity_demo_norte' }, capabilities: [], stage: ref('opportunity_stage', 'stage_demo_discovery_2', 'Necesidades'), status: 'open', next_follow_up_at: null, follow_up_state: 'overdue', amount: null, owner: ref('user', 'user_demo_marta_001', 'Comercial Demo A') },
] as const satisfies readonly OpportunityItemV1[]

export const previewActivities = [
  { id: 'activity_demo_norte_01', kind: 'activity', customer: customer('cust_demo_norte_0001'), activity_kind: 'contacted', safe_summary: 'Contacto comercial registrado', occurred_at: '2026-09-29T15:20:00Z', actor: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), targets: [customer('cust_demo_norte_0001')], capabilities: [] },
  { id: 'activity_demo_bilbao_02', kind: 'activity', customer: customer('cust_demo_bilbao_002'), activity_kind: 'status_changed', safe_summary: 'Seguimiento actualizado', occurred_at: '2026-09-28T10:10:00Z', actor: ref('user', 'user_demo_marta_001', 'Comercial Demo A'), targets: [customer('cust_demo_bilbao_002')], capabilities: [] },
] as const satisfies readonly ActivityItemV1[]

export function customerPreview(id: string) {
  const record = previewCustomers.find(item => item.id === id)
  if (!record) return null
  const contracts = previewContracts.filter(item => item.customer.id === id)
  const services = previewServices.filter(item => item.customer.id === id)
  const serviceIds = new Set<string>(services.map(item => item.id))
  return {
    customer: record,
    portfolioAvailable: id !== 'cust_demo_parcial_010',
    contracts,
    services,
    lines: previewLines.filter(item => serviceIds.has(item.service.id)),
    renewals: previewRenewals.filter(item => item.customer?.id === id),
    permanences: previewPermanences.filter(item => item.customer?.id === id),
    tasks: previewTasks.filter(item => item.customer?.id === id),
    meetings: previewMeetings.filter(item => item.customer?.id === id),
    opportunities: previewOpportunities.filter(item => item.customer?.id === id),
    activity: previewActivities.filter(item => item.customer?.id === id),
  }
}
