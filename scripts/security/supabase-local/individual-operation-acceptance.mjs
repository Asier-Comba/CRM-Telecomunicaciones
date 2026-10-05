import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
// Every observation below comes from the existing normal route and actual Auth,
// with a denied principal and HMAC replay/CAS. No new product operation is added.
export async function individualOperationAcceptance({rpc,sql,check,users,wa,ca,url,anon,appUrl}){
 const cookies={};for(const name of ['ownerA','memberA','viewerA','ownerB']){const values=[],s=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});const auth=await s.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh});check(!auth.error,'individual_actual_session_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(family,kind,operation,input,name)=>{const r=await fetch(appUrl+'/api/'+family+'/v1/'+kind,{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)});return{status:r.status,json:await r.json()}}
 const observed=new Set()
 async function command(family,op,input,prove=true){
  const name=family==='billing'?'ownerA':'memberA',denied=family==='billing'?'memberA':'viewerA'
  const result=await post(family,'commands',op,input,name);check(result.status===200&&result.json.receipt.operation===op,'individual_positive_'+op)
  if(prove){
   const replay=await post(family,'commands',op,input,name);check(replay.status===200&&JSON.stringify(replay.json)===JSON.stringify(result.json),'individual_replay_'+op)
   check((await post(family,'commands',op,{...input,expected_version:input.expected_version+1},name)).status===409,'individual_changed_replay_'+op)
   check((await post(family,'commands',op,{...input,command_id:randomUUID()},name)).status===409,'individual_stale_CAS_'+op)
   check((await post(family,'commands',op,{...input,command_id:randomUUID()},denied)).status===403,'individual_role_denied_'+op)
   const foreign=await post(family,'commands',op,{...input,command_id:randomUUID()},'ownerB');check([403,404].includes(foreign.status),'individual_foreign_denied_'+op)
   observed.add(op)
  }
  return result.json.receipt
 }
 const product=(op,input,prove=true)=>command('product',op,input,prove),billing=(op,input,prove=true)=>command('billing',op,input,prove)
 const cas=(id,version,extra={})=>({command_id:randomUUID(),id,expected_version:version,...extra})
 async function read(family,op,input,foreignArgs,deniedName){
  const name=family==='billing'?'ownerA':'memberA',r=await post(family,'queries',op,input,name);check(r.status===200&&r.json.ok===true,'individual_read_positive_'+op)
  const denied=await rpc(foreignArgs.name,{p_workspace_id:wa,...foreignArgs.args},users.ownerB.token);check(denied.status===403,'individual_read_foreign_scope_denied_'+op)
  if(deniedName)check((await post(family,'queries',op,input,deniedName)).status===403,'individual_read_role_denied_'+op)
  observed.add(op);return r.json.data
 }
 const customer=await product('customer.create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Individual Synthetic Customer'},false)
 await product('customer.update',cas(customer.id,1,{trade_name:'Individual Synthetic Trade'}))
 await product('customer.archive',cas(customer.id,2))
 await product('customer.restore',cas(customer.id,3))
 const contact=await product('contact.create',{command_id:randomUUID(),customer_id:customer.id,display_name:'Individual Synthetic Contact'},false)
 await product('contact.update',cas(contact.id,1,{job_title:'Synthetic Representative'}))
 await product('contact.archive',cas(contact.id,2))
 await product('contact.restore',cas(contact.id,3))
 await read('product','customer.editor',{id:customer.id},{name:'product_v1_customer_editor',args:{p_customer_id:customer.id}},'viewerA')
 const task=await product('task.create',{command_id:randomUUID(),customer_id:customer.id,title:'Individual Synthetic Task'},false)
 await product('task.start',cas(task.id,1))
 await product('task.complete',cas(task.id,2))
 await product('task.reopen',cas(task.id,3))
 await product('task.cancel',cas(task.id,4))
 await read('product','work.get',{kind:'task',id:task.id},{name:'product_v1_work_get',args:{p_kind:'task',p_id:task.id}})
 const meetingFields={customer_id:customer.id,title:'Individual Synthetic Meeting',starts_at:'2026-10-25T09:00:00Z',ends_at:'2026-10-25T10:00:00Z',timezone:'Europe/Madrid'}
 const meeting=await product('meeting.create',{command_id:randomUUID(),...meetingFields},false)
 await product('meeting.reschedule',cas(meeting.id,1,{starts_at:'2026-10-25T10:00:00Z',ends_at:'2026-10-25T11:00:00Z',timezone:'Europe/Madrid'}))
 await product('meeting.complete',cas(meeting.id,2))
 const cancelled=await product('meeting.create',{command_id:randomUUID(),...meetingFields},false);await product('meeting.cancel',cas(cancelled.id,1))
 const noShow=await product('meeting.create',{command_id:randomUUID(),...meetingFields},false);await product('meeting.no_show',cas(noShow.id,1))
 const open=randomUUID(),lost=randomUUID()
 sql("insert into public.opportunity_stages(id,workspace_id,code,display_name,position,outcome)values('"+open+"','"+wa+"','individual_open','Individual Open',10,null),('"+lost+"','"+wa+"','individual_lost','Individual Lost',11,'lost')")
 const opportunity=await product('opportunity.create',{command_id:randomUUID(),customer_id:customer.id,title:'Individual Synthetic Opportunity',stage_id:open},false)
 const original=sql("select id from public.opportunity_stages where workspace_id='"+wa+"'and code='synthetic_open'").trim()
 await product('opportunity.change_stage',cas(opportunity.id,1,{stage_id:original}))
 await product('opportunity.assign',cas(opportunity.id,2,{owner_user_id:users.memberA.id}))
 await product('opportunity.lose',cas(opportunity.id,3,{stage_id:lost,close_reason_code:'not_interested'}))
 await product('opportunity.reopen',cas(opportunity.id,4,{stage_id:open}))
 await product('opportunity.archive',cas(opportunity.id,5))
 await read('product','opportunity.stages',{limit:100},{name:'product_v1_stage_catalog',args:{p_limit:100,p_after_id:null}})
 const fields={issue_on:'2026-10-05',due_on:null,series:'E',currency:'EUR',lines:[{description:'Individual Synthetic Fiscal Line',quantity_milli:1000,unit_price_minor:100,discount_bps:0,tax_bps:0,withholding_bps:0}]}
 const draft=await billing('invoice.create_draft',{command_id:randomUUID(),customer_id:ca,...fields},false)
 await billing('invoice.update_draft',cas(draft.id,1,{...fields,notes:'Individual Synthetic Fiscal Note'}))
 await billing('invoice.trash',cas(draft.id,2))
 await billing('invoice.restore',cas(draft.id,3))
 await billing('invoice.issue',cas(draft.id,4),false)
 await billing('invoice.mark_paid',cas(draft.id,5),false)
 await billing('invoice.reverse_payment',cas(draft.id,6))
 for(const [op,input]of [['invoice.summary',{id:draft.id}],['invoice.list',{series:'E',limit:100}],['configuration.get',{customer_id:ca}]])
  await read('billing',op,input,{name:'billing_v1_'+op.replace('invoice.','invoice_').replace('configuration.','configuration_'),args:{p_input:input}},'memberA')
 const expected=['task.start','task.complete','task.reopen','task.cancel','meeting.reschedule','meeting.complete','meeting.cancel','meeting.no_show','opportunity.change_stage','opportunity.assign','opportunity.lose','opportunity.reopen','opportunity.archive','customer.update','customer.archive','customer.restore','contact.update','contact.archive','contact.restore','customer.editor','work.get','opportunity.stages','invoice.update_draft','invoice.reverse_payment','invoice.trash','invoice.restore','invoice.summary','invoice.list','configuration.get'].sort()
 const actual=[...observed].sort();check(JSON.stringify(actual)===JSON.stringify(expected),'individual_exact_operation_set_29')
 return{additional_individual_operations:actual,additional_individual_evidence:'PASS',additional_individual_count:actual.length}
}
