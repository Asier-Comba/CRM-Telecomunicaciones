import { isDeepStrictEqual } from 'node:util'
import { verifyStructuredClaim, type ClaimEvidence } from './claim-grounding.js'
import type { GroundingEntityKind } from './grounding.js'
import type { BenchmarkCandidate, GoldenJudgment } from './provider-benchmark.js'
import { SemanticReadExecutor, type ReadExecutionContext, type SafeReadResult, type ReadNodeOutcome } from './semantic-read-executor.js'
import { parseSemanticReadPlan, type SemanticReadNode, type SemanticReadPlan, READ_RESULT_KINDS } from './semantic-read-plan.js'
import { SessionReferenceStore } from './session-references.js'

/** Authored semantic specifications and deterministic reference outputs. This
 * suite executes the safety/runtime boundary, NOT natural-language inference.
 * State matrices are distinct evidence/policy conditions, not paraphrase volume.
 */
export type GoldenState = 'complete' | 'empty' | 'multiple' | 'partial' | 'stale' | 'forbidden' | 'failure'
type ReadCall = { capability: string; input: Record<string, string | number | null>; result: SafeReadResult }
type ClaimProbe = { claim: unknown; accepted: boolean }
export type TelecomSemanticGolden = {
  id: string; prompt: string; dimension: string; state: GoldenState
  expectedPlan: SemanticReadPlan
  expectedStatuses: ReadNodeOutcome['status'][]
  expectedCalls: ReadCall[]
  allowedAudiences: Array<'personal' | 'team' | 'workspace'>
  clarification: boolean
  forbiddenActions: readonly string[]
  evidence: ClaimEvidence[]
  claimProbes: ClaimProbe[]
}
export type SemanticGoldenScore = {
  schema: boolean
  planner: { capability: boolean; arguments: boolean }
  policy: boolean
  grounding: boolean
}
const page = { limit: 20, continuation: null }
const scope = { actorId: 'actor_synthetic_01', workspaceId: 'workspace_synthetic_01', sessionId: 'session_synthetic_01', scopeEpoch: 'epoch_synthetic_01' }
const asOf = '2026-09-27T00:00:00Z'
const statuses: Record<GoldenState, ReadNodeOutcome['status']> = { complete: 'one', empty: 'zero', multiple: 'multiple', partial: 'partial', stale: 'stale', forbidden: 'forbidden', failure: 'failure' }
const states: GoldenState[] = ['complete', 'empty', 'multiple', 'partial', 'stale', 'forbidden', 'failure']
const suffix: Record<GoldenState, string> = {
  complete: 'La fuente devuelve evidencia fresca y completa.', empty: 'La fuente confirma un resultado vacío completo.',
  multiple: 'La fuente devuelve dos entidades autorizadas distintas.', partial: 'La fuente solo devuelve una página parcial.',
  stale: 'La fuente devuelve una instantánea desactualizada.', forbidden: 'La lectura de destino está prohibida para esta sesión.',
  failure: 'La lectura de destino falla sin aportar datos.',
}
function node(id: string, capability: string, args: SemanticReadNode['arguments'], parent?: { id: string; field: string }): SemanticReadNode {
  return { id, capability, arguments: args, dependsOn: parent ? [parent.id] : [],
    entityBinding: parent ? [{ targetField: parent.field, source: { type: 'node', nodeId: parent.id } }] : [],
    resultAlias: `${id}_result`, groundingPurpose: parent ? 'follow_up' : 'lookup' }
}
function reply(capability: string, state: GoldenState): SafeReadResult {
  if (state === 'forbidden' || state === 'failure') return { status: state }
  const kind = READ_RESULT_KINDS[capability]
  return { status: 'ok', scopeEpoch: scope.scopeEpoch, freshness: state === 'stale' ? 'stale' : 'fresh', completeness: state === 'partial' ? 'partial' : 'complete',
    entities: !kind || state === 'empty' ? [] : Array.from({ length: state === 'multiple' ? 2 : 1 }, (_, index) => ({ kind, id: `${kind}_synthetic_entity_${index}`, label: index ? 'ACME Norte' : 'ACME Euskadi' })),
  }
}
function evidenceAndProbes(operation: string, state: GoldenState): { evidence: ClaimEvidence[]; claimProbes: ClaimProbe[] } {
  const entityKind = (READ_RESULT_KINDS[operation] ?? 'task') as GroundingEntityKind
  const available = state !== 'forbidden' && state !== 'failure'
  const count = !available || state === 'empty' ? 0 : state === 'multiple' ? 2 : 1
  const field = entityKind === 'activity' ? 'safe_summary' : 'status'
  const value = entityKind === 'activity' ? 'Llamada registrada' : entityKind === 'task' ? 'pending'
    : entityKind === 'meeting' ? 'scheduled' : entityKind === 'renewal' ? 'upcoming' : entityKind === 'opportunity' ? 'open' : 'active'
  const evidence: ClaimEvidence = { evidenceId: 'result_evidence', operation, entityKind, collection: {
    contract_version: 'assistant.grounding.v1', trust: 'untrusted_crm_data', availability: state === 'forbidden' ? 'not_authorized' : state === 'failure' ? 'unavailable' : 'available',
    freshness: !available ? 'unknown' : state === 'stale' ? 'stale' : 'fresh', as_of: available ? asOf : null,
    completeness: !available ? 'unknown' : state === 'partial' ? 'partial' : 'complete', can_assert_empty: state === 'empty', projected_count: count, truncated: false,
    rows: Array.from({ length: count }, (_, index) => ({ id: `${entityKind}_synthetic_entity_${index}`, kind: entityKind, fields: { [field]: value }, protected_fields: {} })),
  } }
  const base = { evidenceId: evidence.evidenceId, operation, entityKind }
  return { evidence: [evidence], claimProbes: [
    { claim: { ...base, kind: 'total', value: count }, accepted: ['complete', 'empty', 'multiple'].includes(state) },
    { claim: { ...base, kind: 'empty' }, accepted: state === 'empty' },
    { claim: { ...base, kind: 'field', entityId: `${entityKind}_synthetic_entity_0`, field, value }, accepted: ['complete', 'multiple', 'partial'].includes(state) },
    { claim: { ...base, kind: 'field', entityId: `${entityKind}_synthetic_entity_0`, field, value, as_of: asOf }, accepted: available && state !== 'empty' },
    { claim: { ...base, kind: 'field', entityId: 'invented_synthetic_entity', field, value }, accepted: false },
  ] }
}
function make(id: string, prompt: string, dimension: string, plan: SemanticReadPlan, nodeStates: GoldenState[], allowedAudiences: TelecomSemanticGolden['allowedAudiences'] = ['personal']): TelecomSemanticGolden {
  const calls: ReadCall[] = []
  const expectedStatuses: ReadNodeOutcome['status'][] = []
  const results = new Map<string, SafeReadResult>()
  plan.nodes.forEach((item, index) => {
    if (item.dependsOn.some(dependency => {
      const prior = results.get(dependency)
      return prior?.status !== 'ok' || prior.freshness !== 'fresh' || prior.completeness !== 'complete' || prior.entities.length !== 1
    })) { expectedStatuses.push('blocked'); return }
    if (item.capability === 'crm.dashboard.get' && !allowedAudiences.includes(item.arguments.audience as 'personal')) { expectedStatuses.push('forbidden'); return }
    const input = { ...item.arguments }
    for (const binding of item.entityBinding) if (binding.source.type === 'node') {
      const prior = results.get(binding.source.nodeId)
      if (prior?.status === 'ok') input[binding.targetField] = prior.entities[0]!.id
    }
    const state = nodeStates[index]!
    const result = reply(item.capability, state)
    calls.push({ capability: item.capability, input, result }); results.set(item.id, result)
    expectedStatuses.push(item.capability === 'crm.dashboard.get' && ['complete', 'empty'].includes(state) ? 'read' : statuses[state])
  })
  const state = nodeStates[nodeStates.length - 1]!
  const finalStatus = expectedStatuses[expectedStatuses.length - 1]
  const evidenceState = finalStatus === 'blocked' ? 'failure' : finalStatus === 'forbidden' ? 'forbidden' : state
  return { id, prompt, dimension, state, expectedPlan: plan, expectedCalls: calls, expectedStatuses, allowedAudiences,
    clarification: expectedStatuses.includes('multiple'), forbiddenActions: ['arbitrary_sql', 'arbitrary_http', 'workspace_selection', 'sensitive_write', 'unmask'],
    ...evidenceAndProbes(plan.nodes[plan.nodes.length - 1]!.capability, evidenceState),
  }
}
const goldens: TelecomSemanticGolden[] = []
const destinations: Array<[string, string, SemanticReadNode['arguments']]> = [
  ['contract.list', 'Lista los contratos activos de ACME.', { ...page, status: 'active' }],
  ['service.list', 'Lista los servicios suspendidos de ACME.', { ...page, status: 'suspended' }],
  ['line.list', 'Muestra las líneas activas de ACME.', { ...page, status: 'active' }],
  ['renewal.list', '¿Qué renovaciones tiene ACME en octubre?', { ...page, from: '2026-10-01', to: '2026-10-31' }],
  ['permanence.list', '¿Qué permanencias de ACME terminan en noviembre?', { ...page, from: '2026-11-01', to: '2026-11-30' }],
  ['task.list', 'Lista tareas pendientes de ACME.', { ...page, status: 'pending' }],
  ['meeting.list', 'Muestra reuniones programadas con ACME en septiembre.', { ...page, status: 'scheduled', from: '2026-09-01', to: '2026-09-30' }],
  ['activity.list', 'Muestra la actividad de ACME de esta semana ya delimitada.', { ...page, from: '2026-09-21', to: '2026-09-27' }],
  ['opportunity.list', 'Lista las oportunidades abiertas de ACME.', { ...page, status: 'open' }],
  ['customer.get', 'Abre la ficha de ACME tras resolver su nombre.', {}],
  ['customer.summary', 'Resume ACME con la evidencia disponible.', {}],
]
for (const [operation, prompt, args] of destinations) for (const state of states) {
  if (state === 'multiple' && ['customer.get', 'customer.summary'].includes(operation)) continue
  const plan: SemanticReadPlan = { version: 1, nodes: [node('lookup', 'crm.customer.search', { ...page, query: 'ACME' }), node('result', `crm.${operation}`, args, { id: 'lookup', field: 'customer_id' })] }
  goldens.push(make(`semantic_${operation.replace('.', '_')}_${state}`, `${prompt} ${suffix[state]}`, 'destination_evidence', plan, ['complete', state]))
}
for (const audience of ['personal', 'team', 'workspace'] as const) for (const state of states.filter(s => s !== 'multiple')) {
  goldens.push(make(`semantic_dashboard_${audience}_${state}`, `Abre el panel ${audience === 'personal' ? 'personal' : audience === 'team' ? 'del equipo' : 'del workspace autorizado'}. ${suffix[state]}`,
    'dashboard_scope_evidence', { version: 1, nodes: [node('dashboard', 'crm.dashboard.get', { audience })] }, [state], [audience]))
}
for (const state of states) {
  goldens.push(make(`semantic_resolution_${state}`, `Busca ACME y después consulta sus renovaciones. En la resolución del nombre: ${suffix[state]}`, 'prerequisite_resolution',
    { version: 1, nodes: [node('lookup', 'crm.customer.search', { ...page, query: 'ACME' }), node('result', 'crm.renewal.list', page, { id: 'lookup', field: 'customer_id' })] }, [state, 'complete']))
}
for (const [sourceOperation, targetOperation, field, prompt] of [
  ['contract.list', 'contract.get', 'contract_id', 'Busca el contrato activo y abre su ficha si es único.'],
  ['service.list', 'line.list', 'service_id', 'Busca el servicio activo y muestra sus líneas si es único.'],
] as const) for (const state of states.filter(s => s !== 'complete')) {
  goldens.push(make(`semantic_binding_${field}_${state}`, `${prompt} ${suffix[state]}`, 'typed_entity_binding', { version: 1, nodes: [
    node('lookup', `crm.${sourceOperation}`, { ...page, status: 'active' }),
    node('result', `crm.${targetOperation}`, targetOperation === 'contract.get' ? {} : page, { id: 'lookup', field }),
  ] }, [state, 'complete']))
}
const compound: Array<[string, string, SemanticReadNode[]]> = [
  ['customer360', 'Busca ACME y reúne contratos, servicios, líneas, tareas y actividad para preparar la visita.', [
    node('lookup', 'crm.customer.search', { ...page, query: 'ACME' }),
    ...['contract.list', 'service.list', 'line.list', 'task.list', 'activity.list'].map((operation, index) => node(`section_${index}`, `crm.${operation}`, page, { id: 'lookup', field: 'customer_id' })),
  ]],
  ['comparison', 'Compara líneas de ACME y Globex con búsquedas separadas.', [
    node('acme', 'crm.customer.search', { ...page, query: 'ACME' }), node('globex', 'crm.customer.search', { ...page, query: 'Globex' }),
    node('acme_lines', 'crm.line.list', page, { id: 'acme', field: 'customer_id' }), node('globex_lines', 'crm.line.list', page, { id: 'globex', field: 'customer_id' }),
  ]],
  ['portfolio_chain', 'Resuelve ACME, su contrato, su servicio y sus líneas de forma dependiente.', [
    node('customer', 'crm.customer.search', { ...page, query: 'ACME' }), node('contract', 'crm.contract.list', page, { id: 'customer', field: 'customer_id' }),
    node('service', 'crm.service.list', page, { id: 'contract', field: 'contract_id' }), node('lines', 'crm.line.list', page, { id: 'service', field: 'service_id' }),
  ]],
  ['followup', 'Prepara seguimiento de ACME con tareas pendientes y oportunidades abiertas.', [
    node('lookup', 'crm.customer.search', { ...page, query: 'ACME' }), node('tasks', 'crm.task.list', { ...page, status: 'pending' }, { id: 'lookup', field: 'customer_id' }),
    node('opportunities', 'crm.opportunity.list', { ...page, status: 'open' }, { id: 'lookup', field: 'customer_id' }),
  ]],
  ['calendar_leap', 'Consulta reuniones del 29 de febrero de 2028 y tareas de marzo por separado.', [
    node('meetings', 'crm.meeting.list', { ...page, from: '2028-02-29', to: '2028-02-29' }), node('tasks', 'crm.task.list', { ...page, from: '2028-03-01', to: '2028-03-31' }),
  ]],
  ['year_boundary', 'Consulta renovaciones de fin de año y permanencias de enero, sin confundirlas.', [
    node('renewals', 'crm.renewal.list', { ...page, from: '2026-12-01', to: '2026-12-31' }), node('permanence', 'crm.permanence.list', { ...page, from: '2027-01-01', to: '2027-01-31' }),
  ]],
  ['contract_commitment', 'Resuelve ACME y filtra sus contratos por fin de permanencia, sin filtrar renovaciones.', [
    node('lookup', 'crm.customer.search', { ...page, query: 'ACME' }), node('contracts', 'crm.contract.list', { ...page, commitment_from: '2026-10-01', commitment_to: '2026-10-31' }, { id: 'lookup', field: 'customer_id' }),
  ]],
  ['cif_resolution', 'Busca el CIF sintético B12345678 y abre el resumen de la empresa única.', [
    node('lookup', 'crm.customer.search', { ...page, query: 'B12345678' }), node('summary', 'crm.customer.summary', {}, { id: 'lookup', field: 'customer_id' }),
  ]],
]
for (const [id, prompt, nodes] of compound) goldens.push(make(`semantic_compound_${id}`, prompt, 'compound_intent', { version: 1, nodes }, nodes.map(() => 'complete')))
for (const audience of ['team', 'workspace'] as const) {
  goldens.push(make(`semantic_policy_${audience}_denied`, `Solicito el panel ${audience}, pero mi política solo permite el personal.`, 'audience_policy',
    { version: 1, nodes: [node('dashboard', 'crm.dashboard.get', { audience })] }, ['forbidden']))
}
export const TELECOM_SEMANTIC_GOLDENS: readonly TelecomSemanticGolden[] = goldens

/** Reference lookup only. It neither parses prompt text nor represents an LLM. */
export function createReferenceSemanticCandidate(): BenchmarkCandidate {
  return { id: 'authored_semantic_reference', mode: 'reference', inputMicrousdPerMillion: 0, outputMicrousdPerMillion: 0,
    async generate(input) {
      const golden = TELECOM_SEMANTIC_GOLDENS.find(item => item.id === input.id)
      if (!golden) throw new Error('unknown_golden')
      return { output: structuredClone(golden.expectedPlan), inputTokens: 0, outputTokens: 0 }
    },
  }
}

export async function evaluateSemanticGolden(golden: TelecomSemanticGolden, candidate: unknown): Promise<SemanticGoldenScore> {
  const parsed = parseSemanticReadPlan(candidate)
  const capability = !!parsed && isDeepStrictEqual(parsed.nodes.map(n => n.capability), golden.expectedPlan.nodes.map(n => n.capability))
  const argumentsMatch = !!parsed && isDeepStrictEqual(parsed, golden.expectedPlan)
  const observed: Array<{ capability: string; input: unknown }> = []
  const executor = new SemanticReadExecutor(async (_scope, operation, input) => {
    const script = golden.expectedCalls[observed.length]
    observed.push({ capability: operation, input })
    if (!script || operation !== script.capability || !isDeepStrictEqual(input, script.input)) return { status: 'failure' }
    return structuredClone(script.result)
  }, new SessionReferenceStore())
  const context: ReadExecutionContext = { scope, currentTurn: 1, now: 100, allowedDashboardAudiences: new Set(golden.allowedAudiences) }
  const execution = await executor.execute(candidate, context)
  const policy = execution.status === 'completed'
    && isDeepStrictEqual(execution.outcomes.map(outcome => outcome.status), golden.expectedStatuses)
    && execution.outcomes.some(outcome => !!outcome.clarification) === golden.clarification
    && isDeepStrictEqual(observed, golden.expectedCalls.map(call => ({ capability: call.capability, input: call.input })))
  const grounding = golden.claimProbes.every(probe => verifyStructuredClaim(probe.claim, golden.evidence).ok === probe.accepted)
  return { schema: !!parsed, planner: { capability, arguments: argumentsMatch }, policy, grounding }
}
export function goldenBenchmarkJudgment(score: SemanticGoldenScore): GoldenJudgment {
  return { capability: score.schema && score.planner.capability, arguments: score.planner.arguments, policy: score.policy, grounding: score.grounding }
}
