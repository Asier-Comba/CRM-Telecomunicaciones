// Unit62 commercial checks recovered from eb77d77d5e2a1df0a45412e1fcfa7a292b66a66b. No private-byte diagnostic functions.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
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
