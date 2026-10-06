import test from 'node:test'
import assert from 'node:assert/strict'
import { TelecomCollectionServiceV1 } from '../../src/lib/server/telecom-collection-service-v1.ts'
import { parseTelecomCollectionInputV1, parseTelecomCollectionResultV1 } from '../../src/lib/server/telecom-collection-runtime-v1.ts'
import { productHttpV1 } from '../../src/lib/server/product-http-v1.ts'
import { ProductServiceV1 } from '../../src/lib/server/product-service-v1.ts'
const id='a1000000-0000-4000-8000-000000000001', workspace='b2000000-0000-4000-8000-000000000001'
const operator={id,version:1,code:'synthetic',display_name:'Synthetic Operator',status:'active',source:'manual'}
const page=(op,items,next=null)=>({contract_version:'telecom.collections.v1',operation:op,items,next_id:next})

test('commercial collection input rejects caller authority, raw lookup, invalid dates, cursors and accessors',()=>{
 for(const input of [{workspace_id:workspace},{msisdn:'+12025550123'},{offset:10},{limit:101},{limit:null},{after_id:'bad'},{status:'invented'},{sort:'name'},{entity_kind:'customer'}])assert.equal(parseTelecomCollectionInputV1('customer.list',input),null)
 assert.equal(parseTelecomCollectionInputV1('activity.list',{date_from:'2026-02-30',date_to:'2026-03-01'}),null)
 assert.equal(parseTelecomCollectionInputV1('renewal.list',{window_from:'2026-01-01',window_to:'2028-01-01'}),null)
 let accessed=false;const value={get limit(){accessed=true;return 20}}
 assert.equal(parseTelecomCollectionInputV1('operator.list',value),null);assert.equal(accessed,false)
 assert.deepEqual(parseTelecomCollectionInputV1('operator.get',{id:id.toUpperCase()}),{id})
})
test('a raw field or duplicate/out-of-order result rejects the entire commercial page',()=>{
 const good=page('operator.list',[operator]);assert.ok(parseTelecomCollectionResultV1('operator.list',{},good))
 for(const extra of ['msisdn','iccid','phone','email','notes','workspace_id','source_event_ref'])assert.equal(parseTelecomCollectionResultV1('operator.list',{},page('operator.list',[{...operator,[extra]:'private'}])),null)
 assert.equal(parseTelecomCollectionResultV1('operator.list',{},page('operator.list',[operator,operator])),null)
 assert.equal(parseTelecomCollectionResultV1('operator.list',{after_id:id},good),null)
 assert.equal(parseTelecomCollectionResultV1('operator.list',{status:'inactive'},good),null)
 assert.equal(parseTelecomCollectionResultV1('operator.list',{limit:2},page('operator.list',[operator],id)),null)
})
test('plan prices preserve exact bigint strings and reject lossy numeric projections',()=>{
 const row={id,plan_id:id,operator_id:id,service_kind:'mobile',plan_status:'active',version_number:1,valid_from:'2026-01-01',valid_until:null,currency:'EUR',recurring_amount_minor:'9007199254740993'}
 assert.ok(parseTelecomCollectionResultV1('plan_version.list',{},page('plan_version.list',[row])))
 for(const amount of [9007199254740993,'-1','01','9223372036854775808'])assert.equal(parseTelecomCollectionResultV1('plan_version.list',{},page('plan_version.list',[{...row,recurring_amount_minor:amount}])),null)
})
test('opportunity summaries permit bounded unique references and reject nested private payloads',()=>{
 const row={id,version:1,customer_id:id,title:'Synthetic Deal',status:'open',stage_id:id,owner_user_id:null,currency:'EUR',amount_minor:'1200',expected_close_date:null,next_follow_up_at:null,has_next_action:false,source:'manual',links:[{kind:'service',id}]}
 assert.ok(parseTelecomCollectionResultV1('opportunity.list',{},page('opportunity.list',[row])))
 for(const links of [[{kind:'service',id,notes:'private'}],[{kind:'line',id}],[{kind:'service',id},{kind:'service',id}]])assert.equal(parseTelecomCollectionResultV1('opportunity.list',{},page('opportunity.list',[{...row,links}])),null)
})
test('commercial reads use active server scope, never caller actor or an elevated port',async()=>{
 let calls=0;let active=true
 const port={resolve:async()=>active?{workspaceId:workspace,role:'viewer'}:null,rpc:async(name,args)=>{calls++;assert.equal(name,'telecom_collection_v1_query');assert.equal(args.p_workspace_id,workspace);assert.equal(args.p_operation,'operator.list');assert.deepEqual(args.p_input,{});return {data:page('operator.list',[operator]),error:null}}}
 const service=new TelecomCollectionServiceV1(port);assert.equal((await service.read('operator.list',{})).ok,true)
 active=false;assert.equal((await service.read('operator.list',{})).error,'access_denied');assert.equal(calls,1)
 assert.equal((await service.read('operator.list',{workspace_id:workspace})).error,'validation');assert.equal(calls,1)
})
test('provider error payload and malformed private projections never cross the service boundary',async()=>{
 for(const response of [{data:null,error:{code:'42501',message:'private'}},{data:page('operator.list',[{...operator,msisdn:'private'}]),error:null}]){
  const s=new TelecomCollectionServiceV1({resolve:async()=>({workspaceId:workspace,role:'member'}),rpc:async()=>response});const r=await s.read('operator.list',{});assert.equal(r.ok,false);assert.equal(JSON.stringify(r).includes('private'),false)
 }
})
test('normal cookie query transport admits collections, rejects writes and preserves no-store/origin',async()=>{
 const commands=new ProductServiceV1({resolve:async()=>({workspaceId:workspace,role:'member'}),rpc:async()=>({data:page('operator.list',[operator]),error:null})})
 const origin='https://synthetic.example.invalid'
 const request=(operation,extra={})=>new Request(origin+'/api/product/v1/queries',{method:'POST',headers:{host:'synthetic.example.invalid',origin,'content-type':'application/json',...extra},body:JSON.stringify({operation,input:{}})})
 const ok=await productHttpV1(request('operator.list'),'queries',async()=>({commands}),origin);assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store')
 assert.equal((await productHttpV1(request('operator.create'),'queries',async()=>({commands}),origin)).status,400)
 assert.equal((await productHttpV1(request('operator.list',{origin:'https://foreign.example.invalid'}),'queries',async()=>({commands}),origin)).status,403)
})

test('bundle kind filters preserve the primary catalog kind while validating the closed DTO',()=>{
 const row={id,plan_id:id,operator_id:id,service_kind:'mobile',plan_status:'active',version_number:1,valid_from:'2026-01-01',valid_until:null,currency:'EUR',recurring_amount_minor:'3000'}
 assert.ok(parseTelecomCollectionResultV1('plan_version.list',{service_kind:'fiber'},page('plan_version.list',[row])))
 assert.equal(parseTelecomCollectionResultV1('plan_version.list',{service_kind:'fiber'},page('plan_version.list',[{...row,service_kind:'arbitrary'}])),null)
 const plan={id,version:1,operator_id:id,code:'synthetic_bundle',display_name:'Synthetic Bundle',service_kind:'mobile',status:'active'}
 assert.ok(parseTelecomCollectionResultV1('plan.list',{service_kind:'fiber'},page('plan.list',[plan])))
 assert.equal(parseTelecomCollectionResultV1('plan_version.list',{operator_id:workspace,service_kind:'fiber'},page('plan_version.list',[row])),null)
})

test('dense line collection composes masks and current SIM/portability context with coherent nullable fields',()=>{
 const row={id,version:1,service_id:id,customer_id:id,contract_id:id,operator_id:id,plan_version_id:null,display_name:'Synthetic Dense Line',status:'pending',source:'manual',activated_on:null,ended_on:null,service_kind:'mobile',masked_msisdn:'••••184',sim_id:workspace,sim_kind:'esim',sim_status:'active',masked_iccid:'••••191',masked_eid:'••••191',portability_id:id,portability_status:'requested',open_commitment_count:1,next_commitment_ends_on:'2026-10-31'}
 const parse=r=>parseTelecomCollectionResultV1('line.list',{},page('line.list',[r]));assert.ok(parse(row))
 for(const p of [{masked_msisdn:'+12025550184'},{masked_iccid:'8900000000000000191'},{sim_status:'replaced'},{sim_id:null},{sim_kind:'physical'},{portability_id:null},{open_commitment_count:-1},{msisdn:'+12025550184'}])assert.equal(parse({...row,...p}),null)
 assert.ok(parse({...row,sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null}))
})
