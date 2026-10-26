import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createSyntheticTelecomPdfBytesV1} from '../../scripts/security/supabase-local/synthetic-telecom-pdf-fixture-v1.mjs'

// Every operation below uses actual Auth/PostgREST/Storage or the actual Next
// cookie transport. SQL creates only fixture infrastructure and reads outcomes.
export async function commercialChain(c, profile) {
  const {rpc,sql,check,users,wa,wb,operator}=c
  const invoke=(family,name,input,u=users.ownerA,w=wa)=>rpc(family+'_v1_'+name,{p_workspace_id:w,p_input:input},u.token)
  const save=async(family,name,input)=>{const r=await invoke(family,name,{command_id:randomUUID(),...input});check(r.status===200&&r.json?.id,profile+'_'+name);return r.json}
  const customer=await save('product','customer_create',{account_kind:'legal_entity',legal_name:'Unit62 '+profile+' commercial customer'})
  const contract=await save('portfolio','contract_create_manual',{customer_id:customer.id,operator_id:operator,start_date:'2026-10-26'})
  await save('portfolio','contract_activate',{id:contract.id,expected_version:1,signed_date:'2026-10-26'})
  const service=await save('portfolio','service_create_manual',{contract_id:contract.id,service_kind:'mobile',display_name:'Unit62 '+profile+' service'})
  await save('portfolio','service_transition',{id:service.id,expected_version:1,status:'active',effective_on:'2026-10-26'})
  const line=await save('portfolio','line_create_manual',{service_id:service.id,display_name:'Unit62 '+profile+' line'})
  await save('portfolio','line_transition',{id:line.id,expected_version:1,status:'active',effective_on:'2026-10-26'})
  const opportunity=await save('product','opportunity_create',{customer_id:customer.id,stage_id:c.stage,title:'Unit62 '+profile+' sale',amount_minor:120000,currency:'EUR',contract_id:contract.id,service_id:service.id})
  const invoiceInput={customer_id:customer.id,contract_id:contract.id,service_id:service.id,opportunity_id:opportunity.id,issue_on:'2026-10-26',due_on:'2026-11-26',series:'A',currency:'EUR',lines:[{description:'Unit62 commercial connectivity',quantity_milli:1000,unit_price_minor:30000,discount_bps:0,tax_bps:2100,withholding_bps:0}]}
  const command_id=randomUUID(),invoice=await invoke('billing','invoice_create_draft',{command_id,...invoiceInput})
  check(invoice.status===200&&invoice.json?.version===1,profile+'_linked_invoice_create')
  assert.deepEqual((await invoke('billing','invoice_create_draft',{command_id,...invoiceInput})).json,invoice.json)
  check(true,profile+'_invoice_same_intent_single_effect')
  const read=await invoke('billing','invoice_get',{id:invoice.json.id})
  check(read.status===200&&read.json.invoice.totals.total_minor===36300&&read.json.invoice.customer_id===customer.id,profile+'_invoice_readback_363')
  const joined=sql(`select count(*) from public.billing_invoices i join public.telecom_contracts c on c.id=i.contract_id and c.customer_id=i.customer_id and c.workspace_id=i.workspace_id join public.telecom_services s on s.id=i.service_id and s.contract_id=c.id and s.customer_id=c.customer_id and s.workspace_id=c.workspace_id join public.telecom_lines l on l.service_id=s.id and l.workspace_id=s.workspace_id join public.product_opportunity_links p on p.opportunity_id=i.opportunity_id and p.kind='service' and p.target_id=s.id where i.id='${invoice.json.id}' and l.id='${line.id}' and i.workspace_id='${wa}' and c.status='active' and s.status='active' and l.status='active' and i.total_minor=36300 and i.status='draft'`)
  check(joined==='1',profile+'_coherent_active_chain_persisted')
  for(const [kind,id]of [['contract',contract.id],['service',service.id],['line',line.id]]){
    check((await invoke('portfolio','get',{kind,id},users.viewerA)).json?.record?.id===id,profile+'_viewer_'+kind+'_read')
    const foreign=await invoke('portfolio','get',{kind,id},users.ownerB,wb)
    check(foreign.status===200&&foreign.json===null,profile+'_foreign_'+kind+'_hidden')
  }
  for(const actor of [users.memberA,users.viewerA,users.ownerB]){
    check((await invoke('billing','invoice_create_draft',{command_id:randomUUID(),...invoiceInput},actor)).status===403,profile+'_invoice_write_denied_'+actor.role+'_'+(actor.workspace===wa?'A':'B'))
    check((await invoke('billing','invoice_get',{id:invoice.json.id},actor)).status===403,profile+'_invoice_read_denied_'+actor.role+'_'+(actor.workspace===wa?'A':'B'))
  }
  const viewerWrite=await invoke('portfolio','line_create_manual',{command_id:randomUUID(),service_id:service.id,display_name:'Must never persist'},users.viewerA)
  check(viewerWrite.status===403,profile+'_viewer_line_write_denied')
  check(sql(`select count(*) from public.telecom_lines where service_id='${service.id}'`)==='1',profile+'_denials_no_extra_line')
  return {customer:customer.id,contract:contract.id,service:service.id,line:line.id,opportunity:opportunity.id,invoice:invoice.json.id}
}

export async function prepareDocuments(c, customer) {
  const {rpc,http,users,wa,check}=c,bytes=createSyntheticTelecomPdfBytesV1()
  const call=(op,input)=>rpc('document_content_v1_'+op,{p_workspace_id:wa,p_input:input},users.ownerA.token)
  async function pending(){
    const r=await call('request_upload',{command_id:randomUUID(),target_kind:'customer',target_id:customer,document_kind:'general',file_name:'Unit62 Synthetic.pdf',media_type:'application/pdf',size_bytes:bytes.length})
    check(r.status===200&&r.json.status==='pending','87_document_pending')
    const id=r.json.id,m=await call('manifest',{id})
    check(m.status===200&&m.json.id===id,'87_pending_manifest')
    const path=wa+'/documents/'+id+'/'+m.json.object_ref
    check((await http('/storage/v1/object/telecom-documents/'+path,users.ownerA.token,'POST',bytes,'application/pdf')).status<300,'87_document_insert')
    return {id,path}
  }
  const active=await pending(),pendingRetry=await pending()
  const finalized=await call('finalize_upload',{command_id:randomUUID(),id:active.id,expected_version:1})
  check(finalized.status===200&&finalized.json.status==='active','87_document_finalize')
  return {active,pendingRetry,bytes,call,version:2}
}

export async function documentProbe(c,d,profile) {
  const {check,http,post,users,wa,sql}=c,closed=profile==='88'
  const ticket=await d.call('request_download',{command_id:randomUUID(),id:d.active.id,expected_version:d.version})
  check(ticket.status===200&&!!ticket.json.ticket_id,profile+'_document_ticket_still_authorized')
  const input={id:d.active.id,ticket_id:ticket.json.ticket_id}
  check((await d.call('manifest',input)).status===200,profile+'_document_manifest_still_authorized')
  const direct=await http('/storage/v1/object/authenticated/telecom-documents/'+d.active.path,users.ownerA.token)
  check(closed?direct.status===400&&sql(`select count(*) from storage.objects where bucket_id='telecom-documents' and name='${d.active.path}'`)==='1':direct.status===200&&direct.bytes.equals(d.bytes),profile+'_direct_read_'+(closed?'denied':'allowed'))
  const proxied=await post('/api/document/v1/content/download','document.download',input)
  check(closed?proxied.status===403&&proxied.json.error==='access_denied':proxied.status===200&&proxied.bytes.equals(d.bytes),profile+'_current_proxy_'+(closed?'blocked':'works'))
  const duplicate=await post('/api/document/v1/content/upload?id='+d.pendingRetry.id,null,d.bytes,'application/pdf')
  check(closed?duplicate.status===409&&duplicate.json.error==='conflict':duplicate.status===200,profile+'_same_byte_upload_retry_'+(closed?'blocked':'works'))
  const verify=await post('/api/document/v1/maintenance','document.verify_content',{command_id:randomUUID(),id:d.active.id,expected_version:d.version,ticket_id:ticket.json.ticket_id})
  check(closed?verify.status===403&&verify.json.error==='access_denied':verify.status===200&&verify.json.receipt.integrity==='verified_sha256',profile+'_current_integrity_'+(closed?'blocked':'works'))
  if(!closed)d.version=verify.json.receipt.version
  const listed=await http('/storage/v1/object/list/telecom-documents',users.ownerA.token,'POST',{prefix:wa+'/documents/'+d.active.id,limit:10,offset:0})
  check(listed.status===200&&listed.json.length===(closed?0:1),profile+'_storage_listing')
  return {direct:direct.status,proxy:proxied.status,same_byte_retry:duplicate.status,integrity:verify.status,ticket:ticket.status,manifest:200}
}

export async function after88Boundaries(c,d,customer) {
  const {check,http,rpc,users,wa,sql,post}=c
  const r=await d.call('request_upload',{command_id:randomUUID(),target_kind:'customer',target_id:customer,document_kind:'general',file_name:'Unit62 after88.pdf',media_type:'application/pdf',size_bytes:d.bytes.length})
  check(r.status===200&&r.json.status==='pending','88_new_upload_intent')
  const id=r.json.id
  check((await post('/api/document/v1/content/upload?id='+id,null,d.bytes,'application/pdf')).status===200,'88_first_upload_works')
  check((await d.call('finalize_upload',{command_id:randomUUID(),id,expected_version:1})).json.status==='active','88_finalize_still_works')
  const metadata=await rpc('document_v1_list',{p_workspace_id:wa,p_input:{target_kind:'customer',target_id:customer,limit:20}},users.ownerA.token)
  check(metadata.status===200&&metadata.json.items.some(v=>v.id===id),'88_metadata_list_works')
  // 88 intentionally leaves W5's cleanup SELECT policy in place. Do not report
  // a stronger no-user-read guarantee than the actual migration provides.
  sql(`update public.document_upload_intents set created_at=statement_timestamp()-interval '20 minutes',expires_at=statement_timestamp()-interval '1 second' where document_id='${d.pendingRetry.id}'`)
  const early=await rpc('document_cleanup_v1_claim',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id:d.pendingRetry.id,expected_version:1}},users.ownerA.token)
  check(early.status===403,'88_cleanup_before_24_hours_still_denied')
  sql(`update public.document_upload_intents set created_at=statement_timestamp()-interval '26 hours',expires_at=statement_timestamp()-interval '25 hours' where document_id='${d.pendingRetry.id}'`)
  const claimed=await rpc('document_cleanup_v1_claim',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id:d.pendingRetry.id,expected_version:1}},users.ownerA.token)
  check(claimed.status===200,'88_cleanup_claim_unchanged')
  const exception=await http('/storage/v1/object/authenticated/telecom-documents/'+d.pendingRetry.path,users.ownerA.token)
  check(exception.status===200&&exception.bytes.equals(d.bytes),'88_exact_expired_cleanup_claim_read_exception')
}
