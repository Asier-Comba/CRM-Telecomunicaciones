import { randomUUID } from 'node:crypto'
import { executeApplicationReadTurnV2 } from '../../../src/assistant/application-turn-v2.ts'
import { ConversationServiceV2 } from '../../../src/assistant/conversation-service-v2.ts'
import { customerCollectionIdentity } from '../../../src/features/customers/customer-identity.ts'
import { normalizeActiveMemberships,selectActiveMembership } from '../../../src/lib/workspace-roles.ts'
import {projectAuthorizedPortabilityListV1} from '../../../src/assistant/portability-read-projection-v1.ts'
import {projectAuthorizedCaseListV1} from '../../../src/assistant/case-read-projection-v1.ts'
import {projectAuthorizedEquipmentListV1} from '../../../src/assistant/equipment-read-projection-v1.ts'
import {parseEquipmentReceiptV1} from '../../../src/lib/server/equipment-runtime-v1.ts'
import {cleanupAssistantGroundingFixturesV3} from './assistant-grounding-fixture-cleanup-v3.mjs'
import {parseAssistantDocumentListInputV1,projectAuthorizedDocumentMetadataListV1} from '../../../src/assistant/document-metadata-read-projection-v1.ts'
import {parseDocumentReceiptV1} from '../../../src/lib/server/document-runtime-v1.ts'
import {readCompleteOwnedGroundingHistoryV1} from './assistant-grounding-history-page-v1.mjs'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve,join,dirname} from 'node:path'

/** Actual Auth/PostgREST/cookie reads and history; the planner alone is a fixed
 * synthetic adapter. No live-model, interactive-UI or business-durability claim. */
export async function assistantReadGroundingAcceptance({ rpc, sql, check, users, wa, wb, anon, url, assistantAppUrl, cookie }) {
  if(process.env.GITHUB_ACTIONS!=='true'||url!=='http://127.0.0.1:54321'||assistantAppUrl!=='http://127.0.0.1:3109')throw Error('W3_READ_GROUNDING_LOCAL_CI_ONLY')
  let phase='START'
  let ownedInvoiceFixture=null
  let ownedCaseFixture=null
  let ownedEquipmentFixture=null
  let ownedDocumentFixture=null
  let primaryFailure=null
  try{
    phase='IMPORT_SDK'
    const {createClient}=await import('@supabase/supabase-js'),owner=users.ownerA
    const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+owner.token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    check([wa,wb,owner.id,users.ownerB.id].every(value=>typeof value==='string'&&/^[0-9a-f-]{36}$/.test(value)),'assistant_grounding_fixture_ids')
    // Fresh JWT/profile/membership/workspace reads, with the production epoch
    // inputs and the existing production membership selection rule. A profile
    // preference is not authority; this harness deliberately points it abroad.
    let authorityStatus='NOT_READ'
    const authority=async()=>{
      const auth=await client.auth.getUser(owner.token)
      if(auth.error||auth.data.user?.id!==owner.id){authorityStatus='JWT_REFUSED';return null}
      const profile=await client.from('profiles').select('workspace_id').eq('id',owner.id).abortSignal(AbortSignal.timeout(10000)).maybeSingle()
      if(profile.error){authorityStatus='PROFILE_REFUSED';return null}
      const candidates=await client.from('workspace_members').select('id,workspace_id,role,status,created_at,workspace:workspaces!inner(status)').eq('user_id',owner.id).eq('status','active').eq('workspace.status','active').order('created_at',{ascending:true}).abortSignal(AbortSignal.timeout(10000))
      if(candidates.error){authorityStatus='MEMBERSHIP_READ_REFUSED';return null}
      const selection=selectActiveMembership(normalizeActiveMemberships(candidates.data??[]),null,profile.data?.workspace_id??null)
      if(!selection.membership||selection.membership.workspace_id!==wa){authorityStatus='MEMBERSHIP_SELECTION_REFUSED';return null}
      const member=await client.from('workspace_members').select('id,role,status,version,workspace:workspaces!inner(status,updated_at)').eq('id',selection.membership.id).eq('user_id',owner.id).eq('workspace_id',selection.membership.workspace_id).abortSignal(AbortSignal.timeout(10000)).maybeSingle()
      const data=member.data,joined=Array.isArray(data?.workspace)?data.workspace.length===1?data.workspace[0]:null:data?.workspace
      if(member.error||!data){authorityStatus='MEMBERSHIP_READ_REFUSED';return null}
      if(data.status!=='active'||data.role!==selection.membership.role||!Number.isSafeInteger(data.version)||data.version<1){authorityStatus='MEMBERSHIP_INACTIVE_OR_VERSION';return null}
      if(!joined||joined.status!=='active'||typeof joined.updated_at!=='string'){authorityStatus='WORKSPACE_INACTIVE_OR_JOIN';return null}
      authorityStatus='READY'
      return{actorId:owner.id,workspaceId:wa,role:data.role,scopeEpoch:data.id+':'+data.version+':'+joined.updated_at}
    }
    phase='AUTH_SETUP'
    if((await authority())?.role!=='owner')throw Error('W3_READ_GROUNDING_AUTH_'+authorityStatus)
    check(true,'assistant_grounding_actual_auth_membership_epoch')
    phase='FIXTURE_SETUP'
    const customers=[randomUUID(),randomUUID()],foreignCustomer=randomUUID(),operator=randomUUID(),foreignOperator=randomUUID(),contracts=[randomUUID(),randomUUID(),randomUUID()]
    sql(`insert into public.customers(id,workspace_id,account_kind,legal_name,created_by_user_id)values('${customers[0]}','${wa}','legal_entity','W3 Grounding Alpha','${owner.id}'),('${customers[1]}','${wa}','legal_entity','W3 Grounding Beta','${owner.id}'),('${foreignCustomer}','${wb}','legal_entity','W3 Grounding Other Tenant','${users.ownerB.id}');insert into public.telecom_operators(id,workspace_id,code,display_name)values('${operator}','${wa}','w3-grounding','W3 Grounding Operator'),('${foreignOperator}','${wb}','w3-grounding','W3 Grounding Operator');insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,start_date,source)values('${contracts[0]}','${wa}','${customers[0]}','${operator}','2026-10-08','manual'),('${contracts[1]}','${wa}','${customers[1]}','${operator}','2026-10-08','manual'),('${contracts[2]}','${wb}','${foreignCustomer}','${foreignOperator}','2026-10-08','manual')`)
    phase='SIM_FIXTURE_CREATE_AUTHORIZED'
    const simCreated=await fetch(assistantAppUrl+'/api/sims/v1',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'sim.create',input:{command_id:randomUUID(),customer_id:customers[0],operator_id:operator,kind:'esim',display_label:'W3 Grounding Prepared eSIM'}}),signal:AbortSignal.timeout(30000)})
    const simBody=await simCreated.json()
    check(simCreated.status===200&&simBody.ok&&simBody.data.operation==='sim.create'&&simBody.data.status==='prepared'&&/^[0-9a-f-]{36}$/.test(simBody.data.id),'assistant_grounding_sim_real_authorized_fixture_not_ai_write')
    const sim=simBody.data.id
    phase='INVOICE_FIXTURE_SETUP'
    // Explicit fixture setup through W1 and the actual cookie, outside every
    // assistant turn; the registered assistant reader admits invoice.list only.
    const invoiceFixtureResponse=await fetch(assistantAppUrl+'/api/billing/v1/commands',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},
      body:JSON.stringify({operation:'invoice.create_draft',input:{command_id:randomUUID(),customer_id:customers[0],issue_on:'2026-08-15',due_on:'2026-08-31',series:'GR',currency:'EUR',
        lines:[{description:'W3 Grounding private invoice fixture',quantity_milli:1000,unit_price_minor:12345,discount_bps:0,tax_bps:0,withholding_bps:0}],notes:'W3 Grounding private note'}}),signal:AbortSignal.timeout(30000)})
    const invoiceFixture=await invoiceFixtureResponse.json()
    check(invoiceFixtureResponse.status===200&&invoiceFixture.ok&&invoiceFixture.receipt?.status==='draft','assistant_grounding_invoice_fixture_actual_w1_cookie_setup')
    if(!invoiceFixture.ok||!invoiceFixture.receipt?.id)throw Error('W3_READ_GROUNDING_INVOICE_FIXTURE_FAILED')
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(invoiceFixture.receipt.id))throw Error('W3_READ_GROUNDING_INVOICE_FIXTURE_ID_INVALID')
    ownedInvoiceFixture={id:invoiceFixture.receipt.id,customer:customers[0],owner:owner.id}
    phase='PORTABILITY_FIXTURE_SETUP'
    // Ordinary authenticated W1 setup outside every assistant turn. This is an
    // isolated synthetic draft, not a carrier call or assistant commercial write.
    const setupPortParent=async(operation,input)=>{
      const result=await rpc(operation,{p_workspace_id:wa,p_input:input},owner.token)
      check(result.status===200&&typeof result.json?.id==='string'&&/^[0-9a-f-]{36}$/.test(result.json.id),'assistant_grounding_portability_parent_setup_'+operation)
      return result.json
    }
    const portService=await setupPortParent('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contracts[0],service_kind:'mobile',display_name:'W3 Grounding private portability service'})
    const portLine=await setupPortParent('portfolio_v1_line_create_manual',{command_id:randomUUID(),service_id:portService.id,display_name:'W3 Grounding private portability line'})
    const portDonor=await rpc('catalog_v1_command',{p_workspace_id:wa,p_operation:'operator.create',p_input:{command_id:randomUUID(),code:'w3-port-donor-'+randomUUID(),display_name:'W3 Grounding private portability donor'}},owner.token)
    check(portDonor.status===200&&/^[0-9a-f-]{36}$/.test(portDonor.json?.id??''),'assistant_grounding_portability_donor_setup')
    const portIdentifier=await rpc('identifier_v1_command',{p_workspace_id:wa,p_operation:'identifier.create_manual',p_input:{command_id:randomUUID(),entity_kind:'line',entity_id:portLine.id,identifier_kind:'msisdn',canonical_value:'+12025550183'}},owner.token)
    check(portIdentifier.status===200&&/^[0-9a-f-]{36}$/.test(portIdentifier.json?.id??''),'assistant_grounding_portability_identifier_setup')
    const portCreate=await fetch(assistantAppUrl+'/api/portability/v1',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'portability.create',input:{command_id:randomUUID(),line_id:portLine.id,number_identifier_id:portIdentifier.json.id,direction:'inbound',donor_operator_id:portDonor.json.id,target_operator_id:operator,requested_on:'2026-10-10',owner_user_id:null}}),signal:AbortSignal.timeout(30000)})
    const portCreated=await portCreate.json()
    check(portCreate.status===200&&portCreated.ok&&portCreated.data?.status==='draft'&&/^[0-9a-f-]{36}$/.test(portCreated.data?.id??''),'assistant_grounding_portability_fixture_actual_w1_cookie_setup')
    phase='CASE_FIXTURE_SETUP'
    const caseSetup=async(operation,input)=>{
      const response=await fetch(assistantAppUrl+'/api/cases/v1',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)})
      const result=await response.json();check(response.status===200&&result.ok&&/^[0-9a-f-]{36}$/.test(result.data?.id??''),'assistant_grounding_case_fixture_actual_w1_'+operation.replace('.','_'));return result.data
    }
    const caseCreated=await caseSetup('case.create',{command_id:randomUUID(),customer_id:customers[0],contract_id:null,service_id:null,line_id:null,
      case_type:'technical',title:'W3 Grounding private case fixture',priority:'high',due_on:'2026-10-15',assigned_user_id:null})
    check(caseCreated.version===1&&caseCreated.status==='open','assistant_grounding_case_fixture_created_version')
    ownedCaseFixture={id:caseCreated.id,customer:customers[0],owner:owner.id,version:1,notes:0}
    const caseNoted=await caseSetup('case.note_create',{command_id:randomUUID(),id:caseCreated.id,expected_version:1,body:'W3 Grounding private case note'})
    check(caseNoted.version===2&&caseNoted.status==='open'&&caseNoted.note_seq===1,'assistant_grounding_case_fixture_private_note_version')
    ownedCaseFixture={...ownedCaseFixture,version:2,notes:1}
    phase='EQUIPMENT_FIXTURE_SETUP'
    const equipmentCreateInput={command_id:randomUUID(),customer_id:customers[0],contract_id:null,service_id:null,line_id:null,commitment_id:null,
      kind:'router',manufacturer:'W3 Grounding private equipment maker',model:'W3 Grounding private equipment model',commercial_description:'W3 Grounding private equipment description',purchased_on:null,assigned_on:null}
    const equipmentCreate=await fetch(assistantAppUrl+'/api/telecom/equipment/v1',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},
      body:JSON.stringify({operation:'equipment.create',input:equipmentCreateInput}),signal:AbortSignal.timeout(30000)})
    const equipmentCreated=await equipmentCreate.json()
    check(equipmentCreate.status===200&&equipmentCreated.ok&&parseEquipmentReceiptV1('equipment.create',equipmentCreateInput,equipmentCreated.data)?.status==='prepared','assistant_grounding_equipment_fixture_actual_w1_cookie_setup')
    ownedEquipmentFixture={id:equipmentCreated.data.id,customer:customers[0],owner:owner.id}
    phase='DOCUMENT_METADATA_FIXTURE_SETUP'
    // Synthetic metadata setup in this already guarded disposable stack. No
    // object is uploaded or content/review/indexing approval fabricated; these
    // registered metadata facts do not prove that file bytes are available.
    const documentId=randomUUID(),documentObject=randomUUID(),documentPath=wa+'/documents/'+documentId+'/'+documentObject
    sql(`insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path,created_by_user_id)values('${documentId}','${wa}','${customers[0]}','general','W3 Grounding private metadata fixture.pdf','application/pdf',1013,'${documentPath}','${owner.id}')`)
    ownedDocumentFixture={id:documentId,customer:customers[0],owner:owner.id,path:documentPath}
    phase='SNAPSHOT'
    const businessSnapshot=()=>sql(`select md5(coalesce(jsonb_agg(payload order by id)::text,'')) from(select id,to_jsonb(x) payload from public.customers x where id in('${customers[0]}','${customers[1]}','${foreignCustomer}') union all select id,to_jsonb(x) payload from public.telecom_contracts x where id in('${contracts[0]}','${contracts[1]}','${contracts[2]}') union all select id,to_jsonb(x) payload from public.telecom_operators x where id in('${operator}','${foreignOperator}','${portDonor.json.id}') union all select id,to_jsonb(x) payload from public.telecom_sims x where id='${sim}' union all select id,to_jsonb(x) payload from public.billing_invoices x where customer_id in('${customers[0]}','${customers[1]}','${foreignCustomer}') union all select id,to_jsonb(x) payload from public.telecom_services x where id='${portService.id}' union all select id,to_jsonb(x) payload from public.telecom_lines x where id='${portLine.id}' union all select id,to_jsonb(x) payload from public.telecom_identifiers x where id='${portIdentifier.json.id}' union all select id,to_jsonb(x) payload from public.telecom_portabilities x where id='${portCreated.data.id}') records`)
    const before=businessSnapshot(),calls=[]
    const caseSnapshot=()=>sql(`select md5(coalesce(jsonb_agg(payload order by id)::text,'')) from(select id,to_jsonb(x) payload from public.service_cases x where id='${caseCreated.id}' union all select id,to_jsonb(x) payload from public.service_case_internal_notes x where case_id='${caseCreated.id}') records`)
    const caseBefore=caseSnapshot()
    const equipmentSnapshot=()=>sql(`select md5(jsonb_build_object('record',(select to_jsonb(x) from public.telecom_equipment x where workspace_id='${wa}' and id='${equipmentCreated.data.id}'),'events',(select jsonb_agg(to_jsonb(x) order by version) from public.telecom_equipment_events x where workspace_id='${wa}' and equipment_id='${equipmentCreated.data.id}'))::text)`)
    const equipmentBefore=equipmentSnapshot()
    const documentSnapshot=()=>sql(`select md5(jsonb_build_object('record',(select to_jsonb(x) from public.documents x where workspace_id='${wa}' and id='${documentId}'),'audit',(select jsonb_agg(to_jsonb(x) order by occurred_at,id) from public.product_audit_events x where workspace_id='${wa}' and entity_id='${documentId}'))::text)`)
    const documentBefore=documentSnapshot()
    let suspendAfterRead=false,suspendAfterBilling=false,suspendAfterSim=false,suspendAfterInvoices=false,suspendAfterPortabilities=false,suspendAfterCases=false,suspendAfterEquipment=false,suspendAfterDocuments=false
    const httpRead=async(family,operation,input)=>{
      const endpoint=family==='collection'?'/api/product/v1/queries':family==='billing_analytics'?'/api/billing/analytics/v1':family==='sim_inventory'?'/api/sims/v1':family==='billing_invoice'?'/api/billing/v1/queries':family==='portability_read'?'/api/portability/v1':family==='case_read'?'/api/cases/v1':family==='equipment_read'?'/api/telecom/equipment/v1':family==='document_metadata'?'/api/document/v1/queries':'/api/telecom/reads/v1'
      const response=await fetch(assistantAppUrl+endpoint,{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation,input:family==='document_metadata'?parseAssistantDocumentListInputV1(input):input}),signal:AbortSignal.timeout(30000)})
      calls.push({operation,status:response.status})
      check(response.headers.get('cache-control')==='no-store','assistant_grounding_reader_no_store')
      const body=await response.json()
      if(suspendAfterRead&&operation==='customer.list'){suspendAfterRead=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterBilling&&operation==='billing.monthly_series'){suspendAfterBilling=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterSim&&operation==='sim.list'){suspendAfterSim=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterInvoices&&operation==='invoice.list'){suspendAfterInvoices=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterPortabilities&&operation==='portability.list'){suspendAfterPortabilities=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterCases&&operation==='case.list'){suspendAfterCases=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterEquipment&&operation==='equipment.list'){suspendAfterEquipment=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      if(suspendAfterDocuments&&operation==='document.list'){suspendAfterDocuments=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      return body
    }
    const readers={collection:(op,input)=>httpRead('collection',op,input),report:(op,input)=>httpRead('report',op,input),billingAnalytics:(op,input)=>httpRead('billing_analytics',op,input),simInventory:(op,input)=>httpRead('sim_inventory',op,input),billingInvoices:(op,input)=>httpRead('billing_invoice',op,input),portabilities:(op,input)=>httpRead('portability_read',op,input),cases:(op,input)=>httpRead('case_read',op,input),equipment:(op,input)=>httpRead('equipment_read',op,input),documents:(op,input)=>httpRead('document_metadata',op,input)},handles=['operator_ref','customer_ref','foreign_customer_ref']
    const resolveReference=async(handle,field)=>{
      if(handle==='operator_ref'&&field==='operator_id'){
        const result=await readers.collection('operator.get',{id:operator})
        return result.ok&&result.data?.record?.id===operator?operator:null
      }
      if(['customer_ref','foreign_customer_ref'].includes(handle)&&field==='customer_id'){
        const id=handle==='customer_ref'?customers[0]:foreignCustomer
        try{const record=await customerCollectionIdentity({collection:async(op,input)=>{const result=await readers.collection(op,input);if(!result.ok)throw Error('W3_READ_GROUNDING_IDENTITY_DENIED');return result.data}},id);return record.id}catch{return null}
      }
      return null
    }
    const conversations=new ConversationServiceV2({authority,invoke:async(workspace,operation,input)=>{
      const result=await rpc('assistant_thread_v2',{p_workspace_id:workspace,p_operation:operation,p_input:input},owner.token)
      return result.status===200?{data:result.json,error:null}:{data:null,error:{code:result.status===403?'42501':result.status===409?'40001':result.status===400?'22023':'XX000'}}
    }})
    const thread=randomUUID()
    phase='THREAD_SETUP'
    check((await conversations.execute('thread.create',{id:thread,title:'Synthetic actual read grounding'})).ok,'assistant_grounding_actual_history_create')
    const node=(limit=20)=>({id:'clients',capability:'crm.customer.list',arguments:[{field:'limit',value:limit}],bindings:[{field:'operator_id',handle:'operator_ref',nodeId:null}]})
    const summary=binding=>({id:'summary',capability:'crm.customer360.summary',arguments:[],bindings:[{field:'customer_id',...binding}]})
    const monthly=handle=>({id:'billing',capability:'crm.billing.monthly_series',arguments:[{field:'currency',value:'EUR'},{field:'from_month',value:'2026-09-01'},{field:'to_month',value:'2026-10-01'}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    const sims=handle=>({id:'sims',capability:'crm.sim.list',arguments:[{field:'kind',value:'esim'},{field:'status',value:'prepared'}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    const portability=handle=>({id:'portabilities',capability:'crm.portability.list',arguments:[{field:'status',value:'draft'},{field:'limit',value:20}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    const plan=nodes=>({version:2,decision:'plan',nodes})
    const run=async(value)=>{
      const turn_id=randomUUID(),input={id:thread,turn_id,text:'Consulta sintética de lectura con plan cerrado'},events=[]
      check((await conversations.execute('turn.start',input)).ok,'assistant_grounding_actual_turn_reservation')
      let cancelled=0
      const provider={name:'deterministic-acceptance',status:'ready',evidenceMode:'synthetic',cancel(){cancelled++},async *streamTurn(){yield{type:'started'}},async createTurn(input){
        check(![wa,wb,owner.id,owner.token,...customers,foreignCustomer,operator,foreignOperator,portService.id,portLine.id,portDonor.json.id,portIdentifier.json.id,portCreated.data.id,caseCreated.id,equipmentCreated.data.id,'+12025550183','W3 Grounding Alpha','W3 Grounding Other Tenant','W3 Grounding private case fixture','W3 Grounding private case note','W3 Grounding private equipment maker','W3 Grounding private equipment model','W3 Grounding private equipment description'].some(privateValue=>input.context.includes(privateValue)),'assistant_grounding_planner_minimized_context')
        return{ok:true,value,model:'synthetic-closed-plan',usage:{inputTokens:0,outputTokens:0,totalTokens:0},durationMs:0}
      }}
      calls.length=0
      await executeApplicationReadTurnV2(input,{readers,authority,resolveReference,offeredHandles:handles,now:()=>new Date()},provider,conversations,new AbortController().signal,(type,data)=>events.push({type,data}))
      check(cancelled===1,'assistant_grounding_provider_cleanup')
      return{turn_id,events,final:events.find(event=>event.type==='final')?.data,calls:[...calls]}
    }
    phase='AUTHORIZED_ROWS'
    let result=await run(plan([node()]))
    const response=result.final?.response,names=response?.blocks.flatMap(block=>block.rows.map(row=>row.display_name)).sort()
    check(response?.status==='completed'&&response.grounded&&JSON.stringify(names)===JSON.stringify(['W3 Grounding Alpha','W3 Grounding Beta']),'assistant_grounding_actual_scoped_rows')
    check(result.final.telemetry.liveModelEvidence===false&&result.final.telemetry.provider==='deterministic-acceptance','assistant_grounding_no_live_model_claim')
    check(response.sources.length===1&&response.sources[0].capability==='crm.customer.list'&&Number.isFinite(Date.parse(response.sources[0].readAt))&&!response.sources[0].partial,'assistant_grounding_actual_source_time')
    phase='PARTIAL_PAGE'
    result=await run(plan([node(1)]))
    check(result.final?.response.grounded&&result.final.response.blocks[0].rows.length===1&&result.final.response.blocks[0].partial&&result.final.response.sources[0].partial,'assistant_grounding_actual_cursor_partiality')
    phase='DEPENDENCY_AMBIGUITY'
    result=await run(plan([node(),summary({handle:null,nodeId:'clients'})]))
    check(result.final?.response.status==='ambiguous'&&!result.final.response.grounded&&!result.final.response.blocks.length&&!result.final.response.sources.length&&!result.calls.some(call=>call.operation==='customer360.summary'),'assistant_grounding_multiple_rows_no_invented_selection')
    phase='AUTHORIZED_SUMMARY'
    result=await run(plan([summary({handle:'customer_ref',nodeId:null})]))
    check(result.final?.response.grounded&&result.final.response.blocks[0].rows[0].contracts===1&&result.final.response.blocks[0].rows[0].services===1&&result.final.response.blocks[0].rows[0].lines===1&&/^\d{4}-\d{2}-\d{2}$/.test(result.final.response.sources[0].asOf),'assistant_grounding_actual_customer_counts_as_of')
    phase='AUTHORIZED_PORTABILITIES'
    result=await run(plan([portability('customer_ref')]))
    const portabilityResponse=result.final?.response
    check(portabilityResponse?.status==='completed'&&portabilityResponse.grounded&&portabilityResponse.blocks.length===1&&portabilityResponse.blocks[0].rows.length===1&&portabilityResponse.blocks[0].rows[0].masked_display==='••••183'&&portabilityResponse.blocks[0].rows[0].status==='Borrador'&&portabilityResponse.blocks[0].rows[0].requested_on==='2026-10-10','assistant_grounding_portability_actual_registered_masked_state')
    check(portabilityResponse.sources[0].capability==='crm.portability.list'&&!portabilityResponse.sources[0].partial&&portabilityResponse.sources[0].asOf===null&&portabilityResponse.blocks[0].title==='Portabilidades del cliente · estado registrado'&&![portCreated.data.id,customers[0],portService.id,portLine.id,portIdentifier.json.id,portDonor.json.id,operator,'+12025550183','number_identifier_id','owner_user_id','created_at','updated_at'].some(value=>JSON.stringify(portabilityResponse).includes(value)),'assistant_grounding_portability_actual_source_private_minimization')
    phase='PORTABILITY_VIEWER_COOKIE'
    const {createServerClient}=await import('@supabase/ssr'),viewerCookies=[]
    const viewerClient=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:values=>viewerCookies.push(...values)}})
    check(!(await viewerClient.auth.setSession({access_token:users.viewerA.token,refresh_token:users.viewerA.refresh})).error,'assistant_grounding_portability_actual_viewer_cookie_setup')
    const viewerPortInput={customer_id:customers[0],status:'draft',limit:20}
    const viewerPortRead=await fetch(assistantAppUrl+'/api/portability/v1',{method:'POST',headers:{cookie:viewerCookies.map(c=>c.name+'='+c.value).join('; '),origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'portability.list',input:viewerPortInput}),signal:AbortSignal.timeout(30000)})
    const viewerPortBody=await viewerPortRead.json(),viewerPortProjection=viewerPortBody.ok?projectAuthorizedPortabilityListV1(viewerPortInput,viewerPortBody.data):null
    check(viewerPortRead.status===200&&viewerPortRead.headers.get('cache-control')==='no-store'&&viewerPortProjection?.items.length===1&&viewerPortProjection.items[0].masked_display==='••••183'&&![customers[0],portService.id,portLine.id,portIdentifier.json.id,portDonor.json.id,operator,'+12025550183','number_identifier_id','owner_user_id'].some(value=>JSON.stringify(viewerPortProjection).includes(value)),'assistant_grounding_portability_actual_viewer_authorized_masked_minimization')
    phase='PORTABILITY_FOREIGN_REFERENCE'
    result=await run(plan([portability('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.final.response.blocks.length&&!result.calls.some(call=>call.operation==='portability.list'),'assistant_grounding_portability_foreign_reference_no_query')
    phase='PORTABILITY_REVOKED_READ'
    suspendAfterPortabilities=true
    try{
      result=await run(plan([portability('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_portability_revocation_discards_facts')
      await readers.portabilities('portability.list',{customer_id:customers[0],limit:20})
      check(calls.at(-1)?.status===403,'assistant_grounding_portability_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_portability_revoked_cancel_after_restore')
    phase='AUTHORIZED_CASE_LIST'
    const cases=handle=>({id:'cases',capability:'crm.case.list',arguments:[{field:'status',value:'open'},{field:'case_type',value:'technical'},{field:'limit',value:20}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    result=await run(plan([cases('customer_ref')]))
    const caseResponse=result.final?.response
    check(caseResponse?.status==='completed'&&caseResponse.grounded&&caseResponse.blocks.length===1&&caseResponse.blocks[0].rows.length===1
      &&caseResponse.blocks[0].rows[0].case_type==='Técnica'&&caseResponse.blocks[0].rows[0].priority==='Alta'&&caseResponse.blocks[0].rows[0].status==='Abierta'
      &&caseResponse.blocks[0].rows[0].due_on==='2026-10-15'&&caseResponse.sources[0].capability==='crm.case.list'&&!caseResponse.sources[0].partial,'assistant_grounding_case_actual_registered_status_priority_dates')
    check(caseResponse.blocks[0].title==='Incidencias del cliente · estado registrado'&&caseResponse.sources[0].asOf===null
      &&![caseCreated.id,...customers,'W3 Grounding private case fixture','W3 Grounding private case note','internal_note_count','customer_id','assigned_user_id','created_at','updated_at'].some(value=>JSON.stringify(caseResponse).includes(value)),'assistant_grounding_case_actual_source_private_minimization')
    const viewerCaseInput={customer_id:customers[0],status:'open',case_type:'technical',limit:20}
    const viewerCaseRead=await fetch(assistantAppUrl+'/api/cases/v1',{method:'POST',headers:{cookie:viewerCookies.map(c=>c.name+'='+c.value).join('; '),origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'case.list',input:viewerCaseInput}),signal:AbortSignal.timeout(30000)})
    const viewerCaseBody=await viewerCaseRead.json(),viewerCaseProjection=viewerCaseBody.ok?projectAuthorizedCaseListV1(viewerCaseInput,viewerCaseBody.data):null
    check(viewerCaseRead.status===200&&viewerCaseRead.headers.get('cache-control')==='no-store'&&viewerCaseProjection?.items.length===1
      &&viewerCaseProjection.items[0].status==='open'&&viewerCaseProjection.items[0].id===caseCreated.id
      &&![customers[0],'W3 Grounding private case fixture','W3 Grounding private case note','internal_note_count','assigned_user_id'].some(value=>JSON.stringify(viewerCaseProjection).includes(value)),'assistant_grounding_case_actual_viewer_cookie_minimization')
    result=await run(plan([cases('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.calls.some(call=>call.operation==='case.list'),'assistant_grounding_case_foreign_reference_no_query')
    suspendAfterCases=true
    try{
      result=await run(plan([cases('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_case_revocation_discards_facts')
      await readers.cases('case.list',{customer_id:customers[0],limit:20})
      check(calls.at(-1)?.status===403,'assistant_grounding_case_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_case_revoked_cancel_after_restore')
    phase='AUTHORIZED_EQUIPMENT_LIST'
    const equipment=handle=>({id:'equipment',capability:'crm.equipment.list',arguments:[{field:'kind',value:'router'},{field:'status',value:'prepared'},{field:'limit',value:20}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    result=await run(plan([equipment('customer_ref')]))
    const equipmentResponse=result.final?.response
    check(equipmentResponse?.status==='completed'&&equipmentResponse.grounded&&equipmentResponse.blocks.length===1&&equipmentResponse.blocks[0].rows.length===1
      &&equipmentResponse.blocks[0].rows[0].kind==='Router'&&equipmentResponse.blocks[0].rows[0].status==='Preparado'&&equipmentResponse.blocks[0].rows[0].assigned_on===null
      &&equipmentResponse.sources[0].capability==='crm.equipment.list'&&!equipmentResponse.sources[0].partial&&equipmentResponse.sources[0].asOf===null,'assistant_grounding_equipment_actual_registered_facts')
    check(equipmentResponse.blocks[0].title==='Equipos del cliente · estado registrado'&&![equipmentCreated.data.id,...customers,'W3 Grounding private equipment maker','W3 Grounding private equipment model','W3 Grounding private equipment description','manufacturer','commercial_description','purchased_on','customer_id','commitment_id','replaces_equipment_id','version'].some(value=>JSON.stringify(equipmentResponse).includes(value)),
      'assistant_grounding_equipment_actual_source_private_minimization')
    const viewerEquipmentInput={customer_id:customers[0],kind:'router',status:'prepared',limit:20}
    const viewerEquipmentRead=await fetch(assistantAppUrl+'/api/telecom/equipment/v1',{method:'POST',headers:{cookie:viewerCookies.map(c=>c.name+'='+c.value).join('; '),origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'equipment.list',input:viewerEquipmentInput}),signal:AbortSignal.timeout(30000)})
    const viewerEquipmentBody=await viewerEquipmentRead.json(),viewerEquipmentProjection=viewerEquipmentBody.ok?projectAuthorizedEquipmentListV1(viewerEquipmentInput,viewerEquipmentBody.data):null
    check(viewerEquipmentRead.status===200&&viewerEquipmentRead.headers.get('cache-control')==='no-store'&&viewerEquipmentProjection?.items.length===1&&viewerEquipmentProjection.items[0].id===equipmentCreated.data.id
      &&viewerEquipmentProjection.items[0].kind==='router'&&![customers[0],'W3 Grounding private equipment maker','W3 Grounding private equipment model','W3 Grounding private equipment description','purchased_on','manufacturer','commercial_description','commitment_id'].some(value=>JSON.stringify(viewerEquipmentProjection).includes(value)),
      'assistant_grounding_equipment_actual_viewer_cookie_minimization')
    result=await run(plan([equipment('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.calls.some(call=>call.operation==='equipment.list'),'assistant_grounding_equipment_foreign_reference_no_query')
    suspendAfterEquipment=true
    try{
      result=await run(plan([equipment('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_equipment_revocation_discards_facts')
      await readers.equipment('equipment.list',{customer_id:customers[0],limit:20})
      check(calls.at(-1)?.status===403,'assistant_grounding_equipment_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_equipment_revoked_cancel_after_restore')
    phase='AUTHORIZED_DOCUMENT_METADATA_LIST'
    const documentNode=handle=>({id:'documents',capability:'crm.document.list',arguments:[{field:'status',value:'active'},{field:'limit',value:20}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    result=await run(plan([documentNode('customer_ref')]))
    const documentRead=result.final?.response
    check(documentRead?.status==='completed'&&documentRead.grounded&&documentRead.blocks.length===1&&documentRead.blocks[0].rows.length===1
      &&documentRead.blocks[0].rows[0].document_kind==='General'&&documentRead.blocks[0].rows[0].status==='Activo'&&documentRead.blocks[0].rows[0].media_type==='application/pdf'&&documentRead.blocks[0].rows[0].size_bytes===1013
      &&documentRead.sources[0].capability==='crm.document.list'&&!documentRead.sources[0].partial,'assistant_grounding_document_actual_direct_metadata_registered_facts_only')
    check(![documentId,documentPath,...customers,'W3 Grounding private metadata fixture.pdf','file_name','storage_path','storage_bucket','sha256_hex','ticket_id','signed_url','indexingApproved','contentClass'].some(value=>JSON.stringify(documentRead).includes(value)),
      'assistant_grounding_document_private_fields_no_content_or_review_claim')
    const directDocumentInput={target_kind:'customer',target_id:customers[0],status:'active',limit:20}
    const viewerDocument=await fetch(assistantAppUrl+'/api/document/v1/queries',{method:'POST',headers:{cookie:viewerCookies.map(c=>c.name+'='+c.value).join('; '),origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'document.list',input:directDocumentInput}),signal:AbortSignal.timeout(30000)})
    check(viewerDocument.status===403,'assistant_grounding_document_actual_viewer_cookie_denied')
    const adminDocumentCookies=[],adminDocumentClient=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:value=>adminDocumentCookies.push(...value)}})
    check(!(await adminDocumentClient.auth.setSession({access_token:users.adminA.token,refresh_token:users.adminA.refresh})).error,'assistant_grounding_document_actual_admin_session')
    const adminDocument=await fetch(assistantAppUrl+'/api/document/v1/queries',{method:'POST',headers:{cookie:adminDocumentCookies.map(c=>c.name+'='+c.value).join('; '),origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'document.list',input:directDocumentInput}),signal:AbortSignal.timeout(30000)})
    const adminDocumentBody=await adminDocument.json(),adminDocumentProjection=adminDocumentBody.ok?projectAuthorizedDocumentMetadataListV1({customer_id:customers[0],status:'active',limit:20},adminDocumentBody.data):null
    check(adminDocument.status===200&&adminDocumentProjection?.items.length===1&&adminDocumentProjection.items[0].document_kind==='general','assistant_grounding_document_actual_admin_cookie_minimization')
    result=await run(plan([documentNode('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.calls.some(call=>call.operation==='document.list'),'assistant_grounding_document_foreign_reference_no_query')
    phase='DOCUMENT_METADATA_REVOKED_READ'
    suspendAfterDocuments=true
    try{
      result=await run(plan([documentNode('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_document_revocation_discards_facts')
      await readers.documents('document.list',{customer_id:customers[0],status:'active',limit:20})
      check(calls.at(-1)?.status===403,'assistant_grounding_document_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_document_revoked_cancel_after_restore')
    phase='AUTHORIZED_INVOICE_LIST'
    const invoiceNode=handle=>({id:'invoices',capability:'crm.invoice.list',arguments:[{field:'status',value:'draft'},{field:'limit',value:20}],bindings:[{field:'customer_id',handle,nodeId:null}]})
    result=await run(plan([invoiceNode('customer_ref')]))
    const invoiceRead=result.final?.response
    check(invoiceRead?.status==='completed'&&invoiceRead.grounded&&invoiceRead.blocks.length===1&&invoiceRead.blocks[0].rows.length===1
      &&invoiceRead.blocks[0].rows[0].total_minor==='123,45'&&invoiceRead.blocks[0].rows[0].currency==='EUR'&&invoiceRead.blocks[0].rows[0].status==='Borrador'
      &&invoiceRead.sources[0].capability==='crm.invoice.list'&&!invoiceRead.sources[0].partial,'assistant_grounding_invoice_actual_nonempty_minimized_money')
    check(![invoiceFixture.receipt.id,...customers,'W3 Grounding private invoice fixture','W3 Grounding private note','customer_id','tax_minor','withholding_minor'].some(value=>JSON.stringify(invoiceRead).includes(value)),
      'assistant_grounding_invoice_private_fields_not_in_response')
    phase='INVOICE_FOREIGN_REFERENCE'
    result=await run(plan([invoiceNode('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.calls.some(call=>call.operation==='invoice.list'),'assistant_grounding_invoice_foreign_reference_no_query')
    phase='INVOICE_REVOKED_READ'
    suspendAfterInvoices=true
    try{
      result=await run(plan([invoiceNode('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_invoice_revocation_discards_financial_facts')
      await readers.billingInvoices('invoice.list',{customer_id:customers[0],limit:20})
      check(calls.at(-1)?.status===403,'assistant_grounding_invoice_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_invoice_revoked_cancel_after_restore')
    phase='BILLING_DENSE_COHORT'
    result=await run(plan([monthly('customer_ref')]))
    const financial=result.final?.response
    check(financial?.status==='completed'&&financial.grounded&&financial.blocks.length===1&&financial.blocks[0].rows.length===2&&financial.blocks[0].rows.map(row=>row.month).join(',')==='2026-09-01,2026-10-01'&&financial.blocks[0].rows.every(row=>['issued_minor','paid_minor','outstanding_minor','overdue_minor'].every(field=>row[field]==='0,00')),'assistant_grounding_billing_actual_empty_customer_dense_zero')
    check(financial.sources[0].capability==='crm.billing.monthly_series'&&!financial.sources[0].partial&&/^\d{4}-\d{2}-\d{2}$/.test(financial.sources[0].asOf)&&financial.blocks[0].columns.find(column=>column.field==='paid_minor')?.label==='Marcado como pagado (EUR)'&&financial.blocks[0].title==='Facturas por mes de emisión · estado actual','assistant_grounding_billing_current_cohort_exact_currency_source')
    phase='BILLING_FOREIGN_REFERENCE'
    result=await run(plan([monthly('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.final.response.blocks.length&&!result.calls.some(call=>call.operation==='billing.monthly_series'),'assistant_grounding_billing_foreign_reference_no_query')
    phase='BILLING_REVOKED_READ'
    suspendAfterBilling=true
    try{
      result=await run(plan([monthly('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_billing_revocation_discards_financial_facts')
      await readers.billingAnalytics('billing.monthly_series',{currency:'EUR',from_month:'2026-09-01',to_month:'2026-10-01',customer_id:customers[0]})
      check(calls.at(-1)?.status===403,'assistant_grounding_billing_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_billing_revoked_cancel_after_restore')
    phase='SIM_MINIMIZED_ACTUAL_READ'
    result=await run(plan([sims('customer_ref')]))
    const inventory=result.final?.response
    check(inventory?.status==='completed'&&inventory.grounded&&inventory.blocks.length===1&&inventory.blocks[0].rows.length===1&&inventory.blocks[0].rows[0].display_label==='W3 Grounding Prepared eSIM'&&inventory.blocks[0].rows[0].kind==='eSIM'&&inventory.blocks[0].rows[0].status==='Preparada'&&inventory.blocks[0].rows[0].masked_iccid===null&&inventory.blocks[0].rows[0].masked_eid===null&&!JSON.stringify(inventory).includes(sim)&&!JSON.stringify(inventory).includes(customers[0]),'assistant_grounding_sim_actual_authorized_minimized_nonzero')
    check(inventory.sources[0].capability==='crm.sim.list'&&!inventory.sources[0].partial&&inventory.sources[0].asOf===null,'assistant_grounding_sim_fresh_page_no_invented_asof')
    phase='SIM_FOREIGN_REFERENCE'
    result=await run(plan([sims('foreign_customer_ref')]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.final.response.blocks.length&&!result.calls.some(call=>call.operation==='sim.list'),'assistant_grounding_sim_foreign_reference_no_query')
    phase='SIM_REVOKED_READ'
    suspendAfterSim=true
    try{
      result=await run(plan([sims('customer_ref')]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_sim_revocation_discards_facts')
      await readers.simInventory('sim.list',{customer_id:customers[0]})
      check(calls.at(-1)?.status===403,'assistant_grounding_sim_actual_cookie_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_sim_revoked_cancel_after_restore')
    phase='AUTHORIZED_FOUR_ENTITY_COMPOUND'
    result=await run(plan([invoiceNode('customer_ref'),portability('customer_ref'),cases('customer_ref'),equipment('customer_ref')]))
    const compound=result.final?.response,expectedCompoundCapabilities=['crm.invoice.list','crm.portability.list','crm.case.list','crm.equipment.list']
    check(compound?.status==='completed'&&compound.grounded&&compound.blocks.length===4&&compound.sources.length===4
      &&JSON.stringify(compound.sources.map(source=>source.capability))===JSON.stringify(expectedCompoundCapabilities)
      &&new Set(compound.sources.map(source=>source.ref)).size===4&&compound.blocks.every((block,i)=>block.rows.length===1&&block.sourceRef===compound.sources[i].ref&&!block.partial)
      &&compound.sources.every(source=>!source.partial&&Number.isFinite(Date.parse(source.readAt))),'assistant_grounding_current_multi_entity_sources_separated')
    check(compound.blocks[0].rows[0].total_minor==='123,45'&&compound.blocks[0].rows[0].currency==='EUR'&&compound.blocks[0].rows[0].status==='Borrador'
      &&compound.blocks[1].rows[0].masked_display==='••••183'&&compound.blocks[1].rows[0].status==='Borrador'
      &&compound.blocks[2].rows[0].case_type==='Técnica'&&compound.blocks[2].rows[0].status==='Abierta'
      &&compound.blocks[3].rows[0].kind==='Router'&&compound.blocks[3].rows[0].status==='Preparado','assistant_grounding_current_multi_entity_exact_registered_facts')
    check(![...customers,invoiceFixture.receipt.id,portCreated.data.id,caseCreated.id,equipmentCreated.data.id,'+12025550183','W3 Grounding private case fixture','W3 Grounding private case note','W3 Grounding private equipment maker','W3 Grounding private equipment model','W3 Grounding private equipment description','W3 Grounding private invoice fixture','W3 Grounding private note'].some(value=>JSON.stringify(compound).includes(value)),
      'assistant_grounding_current_multi_entity_no_private_data')
    check(result.final.telemetry.liveModelEvidence===false&&result.final.telemetry.provider==='deterministic-acceptance','assistant_grounding_current_multi_entity_synthetic_planner_not_live_quality')
    phase='AUTHORIZED_FIVE_ENTITY_DOCUMENT_COMPOUND'
    const fiveNodes=documentHandle=>[invoiceNode('customer_ref'),portability('customer_ref'),cases('customer_ref'),equipment('customer_ref'),documentNode(documentHandle)]
    result=await run(plan(fiveNodes('customer_ref')))
    const compound5=result.final?.response,expectedFiveCapabilities=[...expectedCompoundCapabilities,'crm.document.list']
    check(compound5?.status==='completed'&&compound5.grounded&&compound5.blocks.length===5&&compound5.sources.length===5
      &&JSON.stringify(compound5.sources.map(source=>source.capability))===JSON.stringify(expectedFiveCapabilities)
      &&new Set(compound5.sources.map(source=>source.ref)).size===5
      &&compound5.blocks.every((block,i)=>block.rows.length===1&&block.sourceRef===compound5.sources[i].ref&&!block.partial)
      &&compound5.sources.every(source=>!source.partial&&Number.isFinite(Date.parse(source.readAt))),'assistant_grounding_five_entity_sources_separated')
    check(compound5.blocks[0].rows[0].total_minor==='123,45'&&compound5.blocks[0].rows[0].currency==='EUR'
      &&compound5.blocks[1].rows[0].masked_display==='••••183'&&compound5.blocks[2].rows[0].case_type==='Técnica'
      &&compound5.blocks[3].rows[0].kind==='Router'&&compound5.blocks[4].rows[0].document_kind==='General'
      &&compound5.blocks[4].rows[0].status==='Activo'&&compound5.blocks[4].rows[0].media_type==='application/pdf'&&compound5.blocks[4].rows[0].size_bytes===1013,
      'assistant_grounding_five_entity_exact_registered_facts_metadata_only')
    check(![...customers,invoiceFixture.receipt.id,portCreated.data.id,caseCreated.id,equipmentCreated.data.id,documentId,documentPath,
      'W3 Grounding private metadata fixture.pdf','W3 Grounding private case fixture','W3 Grounding private case note','W3 Grounding private equipment maker',
      'W3 Grounding private equipment model','W3 Grounding private equipment description','W3 Grounding private invoice fixture','W3 Grounding private note',
      '+12025550183','file_name','storage_path','indexingApproved','contentClass'].some(value=>JSON.stringify(compound5).includes(value)),
      'assistant_grounding_five_entity_no_private_content_or_indexing_claim')
    check(result.final.telemetry.liveModelEvidence===false&&result.final.telemetry.provider==='deterministic-acceptance','assistant_grounding_five_entity_synthetic_planner_not_live_quality')
    result=await run(plan(fiveNodes('foreign_customer_ref')))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.final.response.blocks.length
      &&!result.calls.some(call=>call.operation==='document.list'),'assistant_grounding_five_entity_foreign_document_discards_all_facts_no_document_query')
    suspendAfterDocuments=true
    try{
      result=await run(plan(fiveNodes('customer_ref')))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_five_entity_last_read_revocation_discards_all_facts')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_five_entity_revoked_cancel_after_restore')
    phase='FOREIGN_REFERENCE'
    result=await run(plan([summary({handle:'foreign_customer_ref',nodeId:null})]))
    check(result.final?.response.status==='access_changed'&&!result.final.response.grounded&&!result.final.response.blocks.length&&!result.calls.some(call=>call.operation==='customer360.summary'),'assistant_grounding_foreign_ordinary_identity_no_dependent_read')
    phase='FORGED_ID'
    result=await run(plan([{id:'forged',capability:'crm.customer360.summary',arguments:[{field:'customer_id',value:foreignCustomer}],bindings:[]}]))
    check(result.final?.response.status==='invalid_plan'&&!result.final.response.blocks.length&&!result.calls.length,'assistant_grounding_model_uuid_denied_before_read')
    phase='REVOKED_READ'
    suspendAfterRead=true
    try{
      result=await run(plan([node()]))
      check(result.events.map(event=>event.type).join(',')==='started,failed'&&!result.final,'assistant_grounding_revocation_discards_already_read_facts')
      await readers.collection('customer.list',{limit:1})
      check(calls.at(-1)?.status===403,'assistant_grounding_actual_cookie_read_revoked')
    }finally{sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${owner.id}'`)}
    phase='RESTORE'
    check((await conversations.execute('turn.finish',{id:thread,turn_id:result.turn_id,status:'cancelled'})).ok,'assistant_grounding_revoked_read_cancel_after_restore')
    phase='IMMUTABLE_HISTORY'
    const messages=await readCompleteOwnedGroundingHistoryV1((operation,input)=>conversations.execute(operation,input),thread)
    // Each invoice/portability/case/equipment/document group adds three users/two replies;
    // the revoked read has no final reply. Assert the complete exact ledger.
    check(messages.ok&&messages.data.historical&&messages.data.items.length===55&&messages.data.items.filter(item=>item.role==='user').length===32&&messages.data.items.filter(item=>item.role==='assistant').length===23,
      'assistant_grounding_persisted_history_exact_turn_counts')
    check(messages.data.next_sequence===null&&messages.page_count===2,'assistant_grounding_complete_owned_history_closed_pages')
    check(messages.ok&&messages.data.items.filter(item=>item.role==='assistant').every(item=>!['W3 Grounding','telecom.collections','billing.analytics','assistant.sim-list','assistant.invoice-list','assistant.portability-list','assistant.case-list','assistant.equipment-list','assistant.document-metadata-list','document.v1','case.v1','equipment.v1','portability.v1','source_','inputTokens','123,45','••••183','+12025550183'].some(value=>item.content.includes(value))),
      'assistant_grounding_persisted_history_excludes_factual_blocks')
    check(before===businessSnapshot(),'assistant_grounding_no_business_record_change')
    check(caseBefore===caseSnapshot(),'assistant_grounding_no_case_or_note_record_change')
    check(equipmentBefore===equipmentSnapshot(),'assistant_grounding_no_equipment_or_event_record_change')
    check(documentBefore===documentSnapshot(),'assistant_grounding_no_document_or_audit_record_change')
    return 'PASS_ACTUAL_AUTH_COOKIE_READ_GROUNDING_PARTIALITY_REVOCATION_SYNTHETIC_PLANNER'
  }catch(cause){
    const tag=String(cause?.message??'')
    primaryFailure=/^W3_READ_GROUNDING_AUTH_[A-Z_]{1,60}$/.test(tag)?tag
      :/^CHECK_ASSISTANT_GROUNDING_[A-Z0-9_]{1,110}$/.test(tag)?'W3_READ_GROUNDING_'+phase+'_'+tag.slice(6):'W3_READ_GROUNDING_'+phase
    throw Error(primaryFailure)
  }finally{
    const cleanup=await cleanupAssistantGroundingFixturesV3({primaryFailure,caseCleanup:ownedCaseFixture?async()=>{
      const {id,customer,owner,version,notes}=ownedCaseFixture
      // Append-only cases/notes are never deleted or their triggers disabled.
      // Cancel only this unchanged owned synthetic fixture through ordinary W1.
      check(sql(`select count(*) from public.service_cases where id='${id}' and workspace_id='${wa}' and customer_id='${customer}' and created_by_user_id='${owner}' and title='W3 Grounding private case fixture' and status='open' and version=${version} and internal_note_count=${notes}`)==='1','assistant_grounding_owned_case_fixture_cleanup_guard')
      const response=await fetch(assistantAppUrl+'/api/cases/v1',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'case.cancel',input:{command_id:randomUUID(),id,expected_version:version,cancellation_code:'entered_in_error'}}),signal:AbortSignal.timeout(30000)})
      const result=await response.json()
      check(response.status===200&&result.ok&&result.data?.status==='cancelled'&&result.data?.version===version+1,'assistant_grounding_owned_case_fixture_cancelled')
    }:null,invoiceCleanup:ownedInvoiceFixture?async()=>{
      // Restore only this invocation's unchanged synthetic draft in the already
      // guarded disposable CI stack. Never reset a workspace or another fixture.
      const {id,customer,owner}=ownedInvoiceFixture
      const predicate=`id='${id}' and workspace_id='${wa}' and customer_id='${customer}' and created_by_user_id='${owner}' and status='draft' and version=1 and series='GR'`
      sql(`begin;delete from public.billing_invoice_lines l where l.workspace_id='${wa}' and l.invoice_id='${id}' and exists(select 1 from public.billing_invoices where ${predicate});delete from public.billing_invoices where ${predicate};commit`)
      check(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}' and id='${id}'`)==='0','assistant_grounding_owned_invoice_fixture_cleanup')
    }:null,equipmentCleanup:ownedEquipmentFixture?async()=>{
      const {id,customer,owner}=ownedEquipmentFixture
      // Cancel only this exact owned prepared fixture via W1. Append-only events
      // and their guards remain intact; no deletion or trigger manipulation.
      check(sql(`select count(*) from public.telecom_equipment e where id='${id}' and workspace_id='${wa}' and customer_id='${customer}' and created_by_user_id='${owner}' and status='prepared' and version=1 and source='manual' and manufacturer='W3 Grounding private equipment maker' and model='W3 Grounding private equipment model' and commercial_description='W3 Grounding private equipment description' and contract_id is null and service_id is null and line_id is null and commitment_id is null and( select count(*) from public.telecom_equipment_events h where h.workspace_id=e.workspace_id and h.equipment_id=e.id)=1`)==='1','assistant_grounding_owned_equipment_fixture_cleanup_guard')
      const eventOn=sql(`select (statement_timestamp() at time zone 'Europe/Madrid')::date::text`)
      check(/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(eventOn),'assistant_grounding_owned_equipment_fixture_cleanup_date')
      const cancelInput={command_id:randomUUID(),id,expected_version:1,event_on:eventOn}
      const response=await fetch(assistantAppUrl+'/api/telecom/equipment/v1',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'equipment.cancel',input:cancelInput}),signal:AbortSignal.timeout(30000)})
      const result=await response.json()
      check(response.status===200&&result.ok&&parseEquipmentReceiptV1('equipment.cancel',cancelInput,result.data)?.status==='cancelled','assistant_grounding_owned_equipment_fixture_cancelled')
    }:null,documentCleanup:ownedDocumentFixture?async()=>{
      const {id,customer,owner,path}=ownedDocumentFixture
      check(sql(`select count(*) from public.documents d where id='${id}' and workspace_id='${wa}' and customer_id='${customer}' and created_by_user_id='${owner}' and version=1 and status='active' and document_kind='general' and file_name='W3 Grounding private metadata fixture.pdf' and media_type='application/pdf' and size_bytes=1013 and storage_path='${path}' and sha256_hex is null and contract_id is null and service_id is null and line_id is null and service_case_id is null and opportunity_id is null and not exists(select 1 from public.product_audit_events a where a.workspace_id=d.workspace_id and a.entity_id=d.id)`)==='1','assistant_grounding_owned_document_metadata_cleanup_guard')
      const input={command_id:randomUUID(),id,expected_version:1},response=await fetch(assistantAppUrl+'/api/document/v1/commands',{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation:'document.archive',input}),signal:AbortSignal.timeout(30000)})
      const body=await response.json()
      check(response.status===200&&body.ok&&parseDocumentReceiptV1('document.archive',input,body.receipt)?.status==='archived','assistant_grounding_owned_document_metadata_archived')
    }:null})
    // Closed sidecar in the existing approved W3 artifact preserves BOTH cleanup
    // statuses and the primary enum; no IDs, SQL, cookies, rows or raw errors.
    if(process.env.RUNNER_TEMP){
      const base=resolve(process.env.RUNNER_TEMP),directory=join(base,'w3-history-ui')
      if(dirname(directory)!==base)throw Error('W3_READ_GROUNDING_CLEANUP_EVIDENCE_PATH')
      try{mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'grounding-owned-fixture-cleanup.safe.json'),JSON.stringify(cleanup))}
      catch{console.log(JSON.stringify({...cleanup,sidecar_status:'FAIL'}));throw Error('W3_READ_GROUNDING_CLEANUP_EVIDENCE_UNAVAILABLE')}
    }
    if(cleanup.failed)throw Error('W3_READ_GROUNDING_OWNED_FIXTURE_CLEANUP_FAILED')
  }
}
