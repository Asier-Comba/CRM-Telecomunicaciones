import { parseSimInputV1, parseSimResultV1 } from '../lib/server/sim-runtime-v1.ts'
import { snapshotProductJsonV1 } from '../lib/server/product-query-runtime-v1.ts'
import type { SimPageV1 } from '../lib/contracts/sim-v1.ts'

/** Validate the complete W1 DTO before minimizing it. Raw identifiers, customer,
 * operator/line IDs, private associations and timestamps stay outside assistant
 * evidence. No get/history/reveal/activation operation is admitted. */
export function projectAuthorizedSimListV1(input: unknown, raw: unknown): Record<string, unknown> | null {
  const parsed = parseSimInputV1('sim.list', input)
  if (!parsed) return null
  const data = parseSimResultV1('sim.list', parsed, raw) as SimPageV1 | null
  if (!data) return null
  return snapshotProductJsonV1({ contract_version: 'assistant.sim-list.v1', operation: 'sim.list',
    items: data.items.map(row => ({ id: row.id, display_label: row.display_label, kind: row.kind, status: row.status,
      source: row.source, masked_iccid: row.masked_iccid, masked_eid: row.masked_eid })), next_id: data.next_id }) as Record<string, unknown>
}
