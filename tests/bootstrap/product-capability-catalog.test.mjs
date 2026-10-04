import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PRODUCT_RPC_V1} from '../../src/lib/server/product-runtime-v1.ts'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const catalog=JSON.parse(read('docs/master/contracts/product-capabilities.json'))
test('capability catalog covers registered product transport and explicit RPC privileges',()=>{
 const writes=catalog.operations.filter(o=>o.kind==='write')
 assert.deepEqual(writes.map(o=>o.name).sort(),Object.keys(PRODUCT_RPC_V1).sort())
 const http=read('src/lib/server/product-http-v1.ts')
 const reads=http.match(/!\[([^\]]+)\]\.includes\(op\)/)[1].match(/'[^']+'/g).map(x=>x.slice(1,-1))
 assert.deepEqual(catalog.operations.filter(o=>o.kind==='read').map(o=>o.name).sort(),reads.sort())
 assert.equal(new Set(catalog.operations.map(o=>o.name)).size,catalog.operations.length)
 const manifest=JSON.parse(read('scripts/security/native-postgres/function-privileges.json'))
 for(const operation of catalog.operations){
  const privilege=manifest.functions.find(f=>f.signature.startsWith('public.'+operation.rpc+'('))
  assert.ok(privilege,operation.rpc)
  assert.equal(privilege.authenticated,true);assert.equal(privilege.anon,false)
  assert.equal(privilege.public,false);assert.equal(privilege.service_role,false)
  assert.equal(operation.transport.enabled_by_default,false)
  assert.ok(operation.input_type);assert.ok(operation.output_type)
  if(operation.kind==='write'){
   assert.equal(operation.rpc,PRODUCT_RPC_V1[operation.name])
   assert.equal(operation.idempotency.key,'command_id')
   assert.equal(operation.cas.required,!operation.name.endsWith('.create'))
   assert.equal(operation.allowed_roles.includes('viewer'),false)
   assert.equal(operation.assistant_future,'durable_Issue10_confirmation_required_not_registered')
  }
  if(operation.ui_safe)assert.equal(operation.supabase_tested,true)
 }
})
