import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PORTFOLIO_RPC_V1}from '../../src/lib/server/portfolio-runtime-v1.ts'
import {TEAM_RPC_V1} from '../../src/lib/server/team-runtime-v1.ts'
import {BILLING_RPC_V1} from '../../src/lib/server/billing-runtime-v1.ts'
import {BILLING_QUERY_RPC_V1} from '../../src/lib/server/billing-query-runtime-v1.ts'
import {PRODUCT_RPC_V1} from '../../src/lib/server/product-runtime-v1.ts'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const catalog=JSON.parse(read('docs/master/contracts/product-capabilities.json'))
test('capability catalog covers registered product transport and explicit RPC privileges',()=>{
 const writes=catalog.operations.filter(o=>o.kind==='write'&&o.version==='product.v1')
 assert.deepEqual(writes.map(o=>o.name).sort(),Object.keys(PRODUCT_RPC_V1).sort())
 const http=read('src/lib/server/product-http-v1.ts')
 const reads=http.match(/!\[([^\]]+)\]\.includes\(op\)/)[1].match(/'[^']+'/g).map(x=>x.slice(1,-1))
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version.startsWith('product.')).map(o=>o.name).sort(),reads.sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='billing.v1').map(o=>o.name).sort(),Object.keys(BILLING_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='billing.v1'&&o.name!=='invoice.pdf').map(o=>o.name).sort(),Object.keys(BILLING_QUERY_RPC_V1).sort())
 assert.equal(new Set(catalog.operations.map(o=>o.name)).size,catalog.operations.length)
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='team.v1').map(o=>o.name).sort(),Object.keys(TEAM_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='team.v1').map(o=>o.name),['member.list'])
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='write'&&o.version==='portfolio.v1').map(o=>o.name).sort(),Object.keys(PORTFOLIO_RPC_V1).sort())
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read'&&o.version==='portfolio.v1').map(o=>o.name),['portfolio.get'])
 const manifest=JSON.parse(read('scripts/security/native-postgres/function-privileges.json'))
 for(const operation of catalog.operations){
  const privilege=manifest.functions.find(f=>f.signature.startsWith('public.'+operation.rpc+'('))
  assert.ok(privilege,operation.rpc)
  assert.equal(privilege.authenticated,true);assert.equal(privilege.anon,false)
  assert.equal(privilege.public,false);assert.equal(privilege.service_role,false)
  assert.equal(operation.transport.enabled_by_default,false)
  assert.ok(operation.input_type);assert.ok(operation.output_type)
  if(operation.kind==='write'){
   assert.equal(operation.rpc,(operation.version==='billing.v1'?BILLING_RPC_V1:operation.version==='team.v1'?TEAM_RPC_V1:operation.version==='portfolio.v1'?PORTFOLIO_RPC_V1:PRODUCT_RPC_V1)[operation.name])
   assert.equal(operation.idempotency.key,'command_id')
   assert.equal(operation.cas.required,operation.version==='billing.v1'?operation.name!=='invoice.create_draft':operation.version==='team.v1'?operation.name!=='member.invite_intent':operation.version==='portfolio.v1'?(!operation.name.endsWith('.create_manual')&&operation.name!=='contract.record_renewal'):!operation.name.endsWith('.create'))
   assert.equal(operation.allowed_roles.includes('viewer'),false)
   assert.equal(operation.assistant_future,'durable_Issue10_confirmation_required_not_registered')
  }
  if(operation.ui_safe)assert.equal(operation.supabase_tested,true)
 }
})
