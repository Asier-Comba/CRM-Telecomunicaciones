import test from 'node:test'
import assert from 'node:assert/strict'
import { productHttpV1 } from '../../src/lib/server/product-http-v1.ts'
import { ProductServiceV1 } from '../../src/lib/server/product-service-v1.ts'
const id='10000000-0000-4000-8000-000000000001'
function req(body,headers={}){return new Request('http://localhost/api/product/v1/commands',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)})}
const input={operation:'task.create',input:{command_id:id,title:'Synthetic'}}
function services(){const port={resolve:async()=>({workspaceId:id,role:'member'}),rpc:async()=>({error:null,data:{contract_version:'product.v1',operation:'task.create',id,command_id:id,version:1,status:'pending'}})};return {commands:new ProductServiceV1(port)}}
test('transport validates origin, fetch site, content type, envelope and streaming bytes before resolving session',async()=>{
 let calls=0;const factory=async()=>{calls++;return services()}
 for(const [request,status] of [[req(input,{origin:'https://foreign.invalid'}),403],[req(input,{'sec-fetch-site':'cross-site'}),403],[req(input,{'content-type':'text/plain'}),415],[req({...input,workspace_id:id}),400],[req('x'.repeat(12289)),413],[req('{broken'),400]])assert.equal((await productHttpV1(request,'commands',factory)).status,status)
 assert.equal(calls,0)
 const r=await productHttpV1(req(input),'commands',factory);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).receipt.status,'pending')
})
test('transport hides internals and exposes stable conflict/denial statuses',async()=>{
 const factory=async()=>{throw Error('private token')};const r=await productHttpV1(req(input),'commands',factory);assert.equal(r.status,500);assert.doesNotMatch(await r.text(),/private|token/)
 const denied=services();denied.commands=new ProductServiceV1({resolve:async()=>null,rpc:async()=>{throw Error('unused')}})
 assert.equal((await productHttpV1(req(input),'commands',async()=>denied)).status,403)
})
test('production origin uses explicit canonical binding across proxy URL and denies missing configuration',async()=>{
 const oldEnv=process.env.NODE_ENV,oldOrigin=process.env.PRODUCT_V1_ORIGIN
 try{
  process.env.NODE_ENV='production';delete process.env.PRODUCT_V1_ORIGIN
  assert.equal((await productHttpV1(req(input),'commands',async()=>services())).status,503)
  process.env.PRODUCT_V1_ORIGIN='https://crm.example.invalid'
  const request=new Request('http://internal:3108/api/product/v1/commands',{method:'POST',headers:{origin:'https://crm.example.invalid','content-type':'application/json'},body:JSON.stringify(input)})
  assert.equal((await productHttpV1(request,'commands',async()=>services())).status,200)
  assert.equal((await productHttpV1(req(input),'commands',async()=>services())).status,403)
 }finally{if(oldEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldEnv;if(oldOrigin===undefined)delete process.env.PRODUCT_V1_ORIGIN;else process.env.PRODUCT_V1_ORIGIN=oldOrigin}
})
