import { randomUUID } from 'node:crypto'
import { executeApplicationReadTurnV2 } from '../../../src/assistant/application-turn-v2.ts'
import { ConversationServiceV2 } from '../../../src/assistant/conversation-service-v2.ts'
import { customerCollectionIdentity } from '../../../src/features/customers/customer-identity.ts'
import { normalizeActiveMemberships,selectActiveMembership } from '../../../src/lib/workspace-roles.ts'

/** Actual Auth/PostgREST/cookie reads and history; the planner alone is a fixed
 * synthetic adapter. No live-model, interactive-UI or business-durability claim. */
export async function assistantReadGroundingAcceptance({ rpc, sql, check, users, wa, wb, anon, url, assistantAppUrl, cookie }) {
  if(process.env.GITHUB_ACTIONS!=='true'||url!=='http://127.0.0.1:54321'||assistantAppUrl!=='http://127.0.0.1:3109')throw Error('W3_READ_GROUNDING_LOCAL_CI_ONLY')
  let phase='START'
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
    phase='SNAPSHOT'
    const businessSnapshot=()=>sql(`select md5(coalesce(jsonb_agg(payload order by id)::text,'')) from(select id,to_jsonb(x) payload from public.customers x where id in('${customers[0]}','${customers[1]}','${foreignCustomer}') union all select id,to_jsonb(x) payload from public.telecom_contracts x where id in('${contracts[0]}','${contracts[1]}','${contracts[2]}') union all select id,to_jsonb(x) payload from public.telecom_operators x where id in('${operator}','${foreignOperator}')) records`)
    const before=businessSnapshot(),calls=[]
    let suspendAfterRead=false
    const httpRead=async(family,operation,input)=>{
      const endpoint=family==='collection'?'/api/product/v1/queries':'/api/telecom/reads/v1'
      const response=await fetch(assistantAppUrl+endpoint,{method:'POST',headers:{cookie,origin:assistantAppUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)})
      calls.push({operation,status:response.status})
      check(response.headers.get('cache-control')==='no-store','assistant_grounding_reader_no_store')
      const body=await response.json()
      if(suspendAfterRead&&operation==='customer.list'){suspendAfterRead=false;sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${owner.id}'`)}
      return body
    }
    const readers={collection:(op,input)=>httpRead('collection',op,input),report:(op,input)=>httpRead('report',op,input)},handles=['operator_ref','customer_ref','foreign_customer_ref']
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
    const plan=nodes=>({version:2,decision:'plan',nodes})
    const run=async(value)=>{
      const turn_id=randomUUID(),input={id:thread,turn_id,text:'Consulta sintética de lectura con plan cerrado'},events=[]
      check((await conversations.execute('turn.start',input)).ok,'assistant_grounding_actual_turn_reservation')
      let cancelled=0
      const provider={name:'deterministic-acceptance',status:'ready',evidenceMode:'synthetic',cancel(){cancelled++},async *streamTurn(){yield{type:'started'}},async createTurn(input){
        check(![wa,wb,owner.id,owner.token,...customers,foreignCustomer,operator,foreignOperator,'W3 Grounding Alpha','W3 Grounding Other Tenant'].some(privateValue=>input.context.includes(privateValue)),'assistant_grounding_planner_minimized_context')
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
    check(result.final?.response.grounded&&result.final.response.blocks[0].rows[0].contracts===1&&result.final.response.blocks[0].rows[0].services===0&&result.final.response.blocks[0].rows[0].lines===0&&/^\d{4}-\d{2}-\d{2}$/.test(result.final.response.sources[0].asOf),'assistant_grounding_actual_customer_counts_as_of')
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
    const messages=await conversations.execute('message.page',{id:thread,limit:50})
    check(messages.ok&&messages.data.historical&&messages.data.items.length===13&&messages.data.items.filter(item=>item.role==='user').length===7&&messages.data.items.filter(item=>item.role==='assistant').length===6&&messages.data.items.filter(item=>item.role==='assistant').every(item=>!['W3 Grounding','telecom.collections','source_','inputTokens'].some(value=>item.content.includes(value))),'assistant_grounding_persisted_history_excludes_factual_blocks')
    check(before===businessSnapshot(),'assistant_grounding_no_business_record_change')
    return 'PASS_ACTUAL_AUTH_COOKIE_READ_GROUNDING_PARTIALITY_REVOCATION_SYNTHETIC_PLANNER'
  }catch(cause){
    const tag=String(cause?.message??'')
    if(/^W3_READ_GROUNDING_AUTH_[A-Z_]{1,60}$/.test(tag))throw cause
    if(/^CHECK_ASSISTANT_GROUNDING_[A-Z0-9_]{1,110}$/.test(tag))throw Error('W3_READ_GROUNDING_'+phase+'_'+tag.slice(6))
    throw Error('W3_READ_GROUNDING_'+phase)
  }
}
