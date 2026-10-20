import test from 'node:test'
import assert from 'node:assert/strict'
import {ProductServiceV1} from '../../src/lib/server/product-service-v1.ts'
const id='10000000-0000-4000-8000-000000000001',command='20000000-0000-4000-8000-000000000001'
for(const code of ['40001','PT409'])test('customer commands retain safe conflict semantics for '+code,async()=>{
 let calls=0
 const service=new ProductServiceV1({resolve:async()=>({workspaceId:id,role:'member'}),rpc:async()=>{calls++;return{data:null,error:{code,message:'private provider detail'}}}})
 assert.deepEqual(await service.execute('customer.create',{command_id:command,account_kind:'legal_entity',legal_name:'Synthetic Company'}),{ok:false,error:'conflict'})
 assert.equal(calls,1)
})
