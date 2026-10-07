import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {validateTelecomSafeImportV1,TELECOM_SAFE_IMPORT_SCHEMAS_V1} from '../../src/lib/server/telecom-import-mapping-v1.ts'
const workspaceId=randomUUID(),actorId=randomUUID(),customer=randomUUID(),contract=randomUUID(),service=randomUUID(),operator=randomUUID()
const scope={workspaceId,actorId,role:'owner'}
const refs=new Map([
 ['customers:'+customer,{workspaceId,kind:'customers',id:customer}],
 ['contracts:'+contract,{workspaceId,kind:'contracts',id:contract,customer_id:customer,operator_id:operator}],
 ['services:'+service,{workspaceId,kind:'services',id:service,customer_id:customer,contract_id:contract,operator_id:operator}],
 ['operators:'+operator,{workspaceId,kind:'operators',id:operator}],
])
const port={resolve:async()=>scope,lookup:async(w,k,id)=>w===workspaceId?refs.get(k+':'+id)??null:null}
const csv=rows=>new TextEncoder().encode(rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'))
const validService=()=>[randomUUID(),'import',customer,contract,operator,'fiber','Synthetic fibre','pending']
const serviceHeaders=['id','source','customer_id','contract_id','operator_id','service_kind','display_name','status']
test('safe mapping accepts scoped service ancestry, excludes unknown private columns, and returns coded errors without values',async()=>{
 const row=validService(),result=await validateTelecomSafeImportV1('services',csv([serviceHeaders,row]),port)
 assert.equal(result.valid_rows,1);assert.equal(result.production_ready,false);assert.equal(result.processing_status,'validated_metadata_only')
 for(const field of ['workspace_id','msisdn','iccid','eid','serial','password','address_line1','body','url']){
  await assert.rejects(validateTelecomSafeImportV1('services',csv([[...serviceHeaders,field],[...row,'private-value']]),port),/INVALID/)
 }
 row[6]='=PRIVATE_PAYLOAD'
 const invalid=await validateTelecomSafeImportV1('services',csv([serviceHeaders,row]),port)
 assert.equal(invalid.invalid_rows,1);assert.equal(JSON.stringify(invalid).includes('PRIVATE_PAYLOAD'),false);assert.equal(invalid.errors[0].field,'display_name')
})
test('foreign workspace, missing FK, conflicting ancestry and revocation during lookup fail closed',async()=>{
 const row=validService();row[2]=randomUUID()
 assert.equal((await validateTelecomSafeImportV1('services',csv([serviceHeaders,row]),port)).errors.some(e=>e.code==='foreign_key'),true)
 const foreign={...port,lookup:async(w,k,id)=>({...refs.get(k+':'+id),id,kind:k,workspaceId:randomUUID()})}
 assert.equal((await validateTelecomSafeImportV1('services',csv([serviceHeaders,validService()]),foreign)).valid_rows,0)
 const wrong={...port,lookup:async(w,k,id)=>k==='contracts'?{...refs.get(k+':'+id),customer_id:randomUUID()}:port.lookup(w,k,id)}
 assert.equal((await validateTelecomSafeImportV1('services',csv([serviceHeaders,validService()]),wrong)).errors.some(e=>e.code==='ancestry'),true)
 let active=true;const revoked={resolve:async()=>active?scope:null,lookup:async(w,k,id)=>{active=false;return port.lookup(w,k,id)}}
 await assert.rejects(validateTelecomSafeImportV1('services',csv([serviceHeaders,validService()]),revoked),/ACCESS_DENIED/)
 await assert.rejects(validateTelecomSafeImportV1('services',csv([serviceHeaders,validService()]),{...port,resolve:async()=>({...scope,role:'member'})}),/ACCESS_DENIED/)
})
test('metadata pages count all rows while bounding mixed valid/invalid pages and rejecting duplicate IDs',async()=>{
 const rows=Array.from({length:45},validService);rows[1][6]='@private';rows[3][0]=rows[2][0]
 const first=await validateTelecomSafeImportV1('services',csv([serviceHeaders,...rows]),port)
 assert.equal(first.total_rows,45);assert.equal(first.invalid_rows,2);assert.equal(first.rows.length,18);assert.equal(first.next_row,20)
 const second=await validateTelecomSafeImportV1('services',csv([serviceHeaders,...rows]),port,20)
 assert.equal(second.rows.length,20);assert.equal(second.next_row,40);assert.ok(second.rows.every(r=>r.row>20))
 const last=await validateTelecomSafeImportV1('services',csv([serviceHeaders,...rows]),port,40)
 assert.equal(last.rows.length,5);assert.equal(last.next_row,null)
})
test('dates are calendar-valid and ordered; archived customer metadata requires an archive date',async()=>{
 const headers=['id','source','account_kind','legal_name','lifecycle','status','archived_on']
 const row=[randomUUID(),'import','legal_entity','Synthetic','customer','archived','']
 assert.equal((await validateTelecomSafeImportV1('customers',csv([headers,row]),port)).invalid_rows,1)
 row[6]='2026-02-30';assert.equal((await validateTelecomSafeImportV1('customers',csv([headers,row]),port)).invalid_rows,1)
 row[6]='2026-10-06';assert.equal((await validateTelecomSafeImportV1('customers',csv([headers,row]),port)).valid_rows,1)
 const contractHeaders=['id','source','customer_id','operator_id','start_date','end_date','status']
 const c=[randomUUID(),'import',customer,operator,'2026-10-06','2026-01-01','draft']
 assert.equal((await validateTelecomSafeImportV1('contracts',csv([contractHeaders,c]),port)).errors.some(e=>e.code==='invalid_dates'),true)
})
test('exact minor units and typed entitlements stay strings without numeric rounding',async()=>{
 const plan=randomUUID(),version=randomUUID(),catalog={...port,lookup:async(w,k,id)=>({workspaceId:w,kind:k,id})}
 const headers=['id','source','plan_id','version_number','valid_from','currency','recurring_amount_minor','one_time_amount_minor','is_bundle']
 const result=await validateTelecomSafeImportV1('plan_versions',csv([headers,[version,'import',plan,'1','2026-10-06','EUR','999999999999999','0','false']]),catalog)
 assert.equal(result.rows[0].data.recurring_amount_minor,'999999999999999')
 const entHeaders=['id','source','plan_version_id','code','integer_value','boolean_value','text_value']
 const good=[randomUUID(),'import',version,'unlimited_data','','true','']
 assert.equal((await validateTelecomSafeImportV1('entitlements',csv([entHeaders,good]),catalog)).valid_rows,1)
 good[4]='10';assert.equal((await validateTelecomSafeImportV1('entitlements',csv([entHeaders,good]),catalog)).invalid_rows,1)
})
test('all seventeen metadata domains are registered; malformed encodings, duplicate/unsafe headers and oversize files are rejected',async()=>{
 assert.equal(Object.keys(TELECOM_SAFE_IMPORT_SCHEMAS_V1).length,17)
 const bytes=csv([serviceHeaders,validService()])
 for(const invalid of [new Uint8Array([0xff]),new Uint8Array(2*1024*1024+1),new TextEncoder().encode('id,id\nx,y')])await assert.rejects(validateTelecomSafeImportV1('services',invalid,port),/INVALID/)
 await assert.rejects(validateTelecomSafeImportV1('__proto__',bytes,port),/INVALID/)
})
test('each supported domain accepts a representative safe metadata row, including SIM, cases, locations and equipment',async()=>{
 const u=randomUUID(),v=randomUUID(),version=randomUUID(),generic={...port,lookup:async(w,kind,id)=>({workspaceId:w,kind,id})}
 const examples={
  customers:{account_kind:'legal_entity',legal_name:'Synthetic Company',lifecycle:'lead',status:'active'},
  contacts:{customer_id:u,display_name:'Synthetic Contact',is_primary:'false',status:'active'},
  operators:{code:'synthetic_operator',display_name:'Synthetic Operator',status:'active'},
  plans:{operator_id:u,code:'synthetic_plan',display_name:'Synthetic Plan',service_kind:'fiber',status:'active'},
  plan_versions:{plan_id:u,version_number:'1',valid_from:'2026-10-06',currency:'JPY',recurring_amount_minor:'100',one_time_amount_minor:'0',is_bundle:'false'},
  entitlements:{plan_version_id:version,code:'data_mib',integer_value:'10240'},
  bundle_components:{plan_version_id:version,position:'1',component_kind:'base',service_kind:'fiber',quantity:'1'},
  contracts:{customer_id:u,operator_id:v,start_date:'2026-10-06',status:'draft'},
  services:{customer_id:u,contract_id:v,operator_id:operator,service_kind:'fiber',display_name:'Synthetic Fibre',status:'pending'},
  lines:{service_id:u,display_name:'Synthetic Line',status:'pending'},
  renewals:{contract_id:u,target_on:'2027-10-06',status:'open'},
  permanences:{contract_id:u,commitment_kind:'minimum_term',starts_on:'2026-10-06',ends_on:'2027-10-06',status:'open'},
  sims:{customer_id:u,operator_id:v,kind:'esim',display_label:'Synthetic eSIM',status:'prepared'},
  portabilities:{line_id:u,number_identifier_id:version,donor_operator_id:v,target_operator_id:operator,direction:'inbound',requested_on:'2026-10-06',status:'draft'},
  cases:{customer_id:u,case_type:'technical',title:'Synthetic Fault',priority:'normal',status:'open'},
  service_locations:{customer_id:u,label:'Synthetic Office',country:'ES'},
  equipment:{customer_id:u,kind:'router',manufacturer:'Synthetic Maker',model:'Synthetic Router',status:'prepared'},
 }
 for(const [kind,fields]of Object.entries(examples)){
  const record={id:randomUUID(),source:'import',...fields},result=await validateTelecomSafeImportV1(kind,csv([Object.keys(record),Object.values(record)]),generic)
  assert.equal(result.valid_rows,1,kind+': '+JSON.stringify(result.errors));assert.equal(result.errors.length,0)
 }
})
