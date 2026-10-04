import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID}from 'node:crypto'
import {parsePortfolioInputV1,parsePortfolioReceiptV1,parsePortfolioGetV1,PORTFOLIO_RPC_V1}from '../../src/lib/server/portfolio-runtime-v1.ts'
import {PortfolioServiceV1}from '../../src/lib/server/portfolio-service-v1.ts'
import {portfolioHttpV1}from '../../src/lib/server/portfolio-http-v1.ts'
const id=randomUUID(),command_id=randomUUID()
const create={command_id,customer_id:randomUUID(),operator_id:randomUUID(),start_date:'2026-01-01'}
test('portfolio accepts closed human inputs and rejects authority, protected identifiers and malformed dates',()=>{
 assert.ok(parsePortfolioInputV1('contract.create_manual',create))
 for(const bad of [{...create,source:'manual'},{...create,workspace_id:id},{...create,status:'active'},{...create,start_date:'2026-02-30'},{...create,start_date:'2026-01-01T00:00:00Z'}])assert.equal(parsePortfolioInputV1('contract.create_manual',bad),null)
 const line={command_id,service_id:id,display_name:'Synthetic Line'}
 for(const k of ['msisdn','sim','iccid','phone','operator_id','source'])assert.equal(parsePortfolioInputV1('line.create_manual',{...line,[k]:id}),null)
 for(const bad of [0,1.1,1e15,'1'])assert.equal(parsePortfolioInputV1('line.update_label',{command_id,id,expected_version:bad,display_name:'Label'}),null)
 let accessed=false;const getter={...create};Object.defineProperty(getter,'source',{enumerable:true,get(){accessed=true;throw Error()}})
 assert.equal(parsePortfolioInputV1('contract.create_manual',getter),null);assert.equal(accessed,false)
})
test('portfolio receipt verifies operation, command, expected version, lifecycle and provenance',()=>{
 const input={command_id,id,expected_version:2,status:'ended',effective_on:'2026-03-01'}
 const r={contract_version:'portfolio.v1',operation:'line.transition',command_id,id,version:3,status:'ended',source:'manual'}
 assert.ok(parsePortfolioReceiptV1('line.transition',input,r))
 for(const patch of [{source:'import'},{version:2},{id:randomUUID()},{status:'active'},{phone:'redacted'},{operation:'service.transition'}])assert.equal(parsePortfolioReceiptV1('line.transition',input,{...r,...patch}),null)
 assert.ok(parsePortfolioReceiptV1('line.update_label',{command_id,id,expected_version:2,display_name:'Human label'},{...r,operation:'line.update_label',source:'import'}))
})
test('portfolio editor rejects malformed lifecycle, foreign identity and sensitive extra fields',()=>{
 const input={kind:'line',id},r={contract_version:'portfolio.v1',kind:'line',record:{id,version:1,status:'active',source:'import',service_id:randomUUID(),display_name:null,activated_on:'2026-01-01',ended_on:null,status_effective_on:'2026-01-01'}}
 assert.ok(parsePortfolioGetV1(input,r))
 for(const patch of [{status:'pending'},{id:randomUUID()},{ended_on:'2025-01-01'},{source:'operator'},{msisdn:'private'},{status_effective_on:'2025-12-31'}])assert.equal(parsePortfolioGetV1(input,{...r,record:{...r.record,...patch}}),null)
})
test('portfolio service resolves each call and maps CAS without exposing backend details',async()=>{
 let role='member',calls=0
 const service=new PortfolioServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async(name,args)=>{calls++;assert.equal(name,PORTFOLIO_RPC_V1['contract.create_manual']);assert.equal(args.p_workspace_id,id);return{data:null,error:{code:'40001',message:'private SQL'}}}})
 assert.deepEqual(await service.execute('contract.create_manual',create),{ok:false,error:'conflict'})
 role='viewer';assert.deepEqual(await service.execute('contract.create_manual',create),{ok:false,error:'access_denied'});assert.equal(calls,1)
})
test('portfolio HTTP inherits exact Origin and rejects forged authority before dispatch',async()=>{
 const origin='http://127.0.0.1:3108';let calls=0
 const request=(operation,input,from=origin)=>new Request(origin+'/api/portfolio/v1/commands',{method:'POST',headers:{host:'127.0.0.1:3108',origin:from,'content-type':'application/json'},body:JSON.stringify({operation,input})})
 const service={execute:async()=>{calls++;return{ok:true,receipt:{}}}}
 assert.equal((await portfolioHttpV1(request('contract.create_manual',create),'commands',async()=>service,origin)).status,200)
 assert.equal((await portfolioHttpV1(request('contract.create_manual',create,'https://evil.invalid'),'commands',async()=>service,origin)).status,403)
 assert.equal((await portfolioHttpV1(request('provider.send',create),'commands',async()=>service,origin)).status,400)
 assert.equal(calls,1)
})
test('renewal window and permanence inputs preserve closed canonical dates and reasons',()=>{
 const renewal={command_id,contract_id:id,target_on:'2027-01-01',opens_on:'2026-12-01',closes_on:'2027-01-31'}
 assert.ok(parsePortfolioInputV1('contract.record_renewal',renewal))
 assert.ok(parsePortfolioInputV1('contract.record_renewal',{...renewal,opens_on:null,closes_on:null}))
 for(const patch of [{opens_on:null},{closes_on:'2026-12-31'},{target_on:'2027-02-30'},{source:'import'},{status:'completed'}])assert.equal(parsePortfolioInputV1('contract.record_renewal',{...renewal,...patch}),null)
 const permanence={command_id,contract_id:id,commitment_kind:'minimum_term',starts_on:'2026-01-01',ends_on:'2027-01-01',reason_code:'manual_term'}
 assert.ok(parsePortfolioInputV1('permanence.create_manual',permanence))
 for(const patch of [{ends_on:'2025-12-31'},{reason_code:'Free form'},{commitment_kind:'billing'},{source:'manual'}])assert.equal(parsePortfolioInputV1('permanence.create_manual',{...permanence,...patch}),null)
})
test('deadline receipts use entity lifecycle and CAS instead of contractual state',()=>{
 const r={contract_version:'portfolio.v1',operation:'contract.record_renewal',command_id,id,version:1,status:'open',source:'manual'}
 assert.ok(parsePortfolioReceiptV1('contract.record_renewal',{command_id,contract_id:id,target_on:'2027-01-01',opens_on:null,closes_on:null},r))
 const edit={command_id,id,expected_version:2,reason_code:'human_resolved'}
 assert.ok(parsePortfolioReceiptV1('renewal.resolve',edit,{...r,operation:'renewal.resolve',version:3,status:'completed'}))
 assert.equal(parsePortfolioReceiptV1('renewal.resolve',edit,{...r,operation:'renewal.resolve',version:3,status:'open'}),null)
})
test('deadline editors validate window bounds and immutable association',()=>{
 const input={kind:'renewal',id},record={id,version:2,status:'open',source:'manual',contract_id:randomUUID(),target_on:'2027-01-01',opens_on:null,closes_on:null,reason_code:null},v={contract_version:'portfolio.v1',kind:'renewal',record}
 assert.ok(parsePortfolioGetV1(input,v))
 for(const patch of [{closes_on:'2027-01-01'},{contract_id:null},{reason_code:'secret arbitrary text'},{target_on:'2027-02-30'},{status:'active'}])assert.equal(parsePortfolioGetV1(input,{...v,record:{...record,...patch}}),null)
})
