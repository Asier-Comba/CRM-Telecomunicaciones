// Minimal reproduction of the assistant cross-turn reference gap, against W3's real
// parser (read-only import; no W3 file is modified). Run from the repo root:
//   node --experimental-transform-types scripts/w5/assistant-handles-repro.mjs
// Contract: docs/w5/ASSISTANT_HANDLES_CONTRACT.md. No network, no provider, no DB.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { parseProductReadPlanV2 } = await import(pathToFileURL(process.cwd() + '/src/assistant/product-read-plan-v2.ts').href)
const verdict = (plan, offered) => parseProductReadPlanV2(plan, offered) === null ? 'REJECTED' : 'ACCEPTED'
const get = (args, bindings) => ({ version: 2, decision: 'plan', nodes: [{ id: 'n1', capability: 'crm.renewal.get', arguments: args, bindings }] })
const viaHandle = get([], [{ field: 'id', handle: 'h_prev_turn', nodeId: null }])
const cases = [
  // The gap: the route passes offeredHandles: [], so a follow-up turn can never refer to an entity it already showed.
  ['A route today (offered=[]), cross-turn handle', verdict(viaHandle, []), 'REJECTED'],
  // Control: the parser already accepts a handle the server offered; only the server side is missing.
  ['B server offered h_prev_turn', verdict(viaHandle, ['h_prev_turn']), 'ACCEPTED'],
  ['C literal UUID from the model', verdict(get([{ field: 'id', value: '357bb147-cc6a-44f7-8e56-63fc82820a5a' }], []), []), 'REJECTED'],
  ['D handle the server did not offer (forged)', verdict(viaHandle, ['h_other']), 'REJECTED'],
  ['E same-turn chain via nodeId', verdict({ version: 2, decision: 'plan', nodes: [
    { id: 'n1', capability: 'crm.renewal.list', arguments: [{ field: 'limit', value: 5 }], bindings: [] },
    { id: 'n2', capability: 'crm.renewal.get', arguments: [], bindings: [{ field: 'id', handle: null, nodeId: 'n1' }] }] }, []), 'ACCEPTED'],
]
for (const [name, got] of cases) console.log(`${got.padEnd(8)} ${name}`)
for (const [name, got, want] of cases) assert.equal(got, want, name)
console.log('REPRO PASS: parser enforces offered handles; route offers none (cross-turn references impossible)')
