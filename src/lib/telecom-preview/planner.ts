import type { ReadPlannerInput } from '../../assistant/telecom-read-turn.ts'
import type { SemanticReadNode } from '../../assistant/semantic-read-plan.ts'
import { normalizePreviewText } from './repository.ts'

const node = (id: string, capability: string, args: SemanticReadNode['arguments']): SemanticReadNode => ({
  id, capability, arguments: args, dependsOn: [], entityBinding: [], resultAlias: id, groundingPurpose: 'lookup',
})
const page = { limit: 50, continuation: null }

/** DEV-ONLY scripted planner behind the real W3 provider interface.
 * It never reads fixtures or receives CRM text; all entity resolution is a read.
 * This is a bounded preview grammar, not evidence of live LLM generalization.
 */
export async function planPreviewRead(input: ReadPlannerInput, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) throw new Error('aborted')
  const text = normalizePreviewText(input.userText).replace(/[¿?!.]/g, '')
  if (/workspace|service.?role|sql|ignora|ignore|instruccion|system.?prompt|cif|https?:|crear|crea |borra|editar|enviar/.test(text)) return { decision: 'abstain', plan: null }
  let operation: string | undefined
  if (/resumen del dia|tengo hoy/.test(text)) operation = 'dashboard.get'
  else if (/permanencia/.test(text)) operation = 'permanence.list'
  else if (/renovacion|renueva/.test(text)) operation = 'renewal.list'
  else if (/oportunidad/.test(text)) operation = 'opportunity.list'
  else if (/tarea/.test(text)) operation = 'task.list'
  else if (/reunion/.test(text)) operation = 'meeting.list'
  else if (/linea/.test(text)) operation = 'line.list'
  else if (/contrato/.test(text)) operation = 'contract.list'
  else if (/resume|resumen de/.test(text)) operation = 'customer.summary'
  const search = text.match(/^(?:busca(?:r)?(?: cliente)?|resume|resumen de)\s+(.+)$/)?.[1]
    ?? text.match(/(?:tiene| de)\s+(.+)$/)?.[1]
  const needsCustomer = ['customer.summary', 'line.list', 'contract.list'].includes(operation ?? '')
  if (needsCustomer && !search) return { decision: 'clarify', plan: null }
  const nodes: SemanticReadNode[] = []
  if (search && (needsCustomer || /^busca/.test(text))) {
    nodes.push(node('customer', 'crm.customer.search', { ...page, query: search }))
    if (needsCustomer) {
      const read = node('detail', `crm.${operation}`, operation === 'customer.summary' ? {} : page)
      read.dependsOn = ['customer']
      read.entityBinding = [{ targetField: 'customer_id', source: { type: 'node', nodeId: 'customer' } }]
      nodes.push(read)
    }
  } else if (operation) nodes.push(node('result', `crm.${operation}`, operation === 'dashboard.get' ? { audience: 'workspace' } : page))
  else return { decision: 'clarify', plan: null }
  return { decision: 'plan', plan: { version: 1, nodes } }
}
