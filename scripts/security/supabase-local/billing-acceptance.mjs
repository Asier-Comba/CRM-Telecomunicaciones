import { randomUUID } from 'node:crypto'
import { createServerClient } from '@supabase/ssr'
export async function billingAcceptance({rpc,check,users,wa,wb,ca,url,anon,appUrl}){
 const invoke=(name,input,u=users.ownerA,w=wa)=>rpc('billing_v1_'+name,{p_workspace_id:w,p_input:input},u.token)
 const profile={legal_name:'HTTP Synthetic Fiscal',tax_id:'SYNTHETIC-NOT-VALID',address:'Synthetic Street 1',postal_code:'00000',city:'Synthetic',region:'Synthetic',country:'ES'}
 check((await invoke('issuer_set',{command_id:randomUUID(),expected_version:0,profile,currency:'EUR',default_series:'A'})).status===200,'billing_actual_issuer')
 check((await invoke('customer_fiscal_set',{command_id:randomUUID(),customer_id:ca,expected_version:0,profile})).status===200,'billing_actual_fiscal')
 const lines=[{description:'HTTP Synthetic Fractional',quantity_milli:1500,unit_price_minor:101,discount_bps:500,tax_bps:2100,withholding_bps:1500}]
 const input={command_id:randomUUID(),customer_id:ca,issue_on:'2026-10-04',due_on:'2026-10-10',series:'A',currency:'EUR',lines}
 const {command_id:ignored,...candidate}=input;void ignored
 const proposed=await invoke('invoice_propose',{source:'text',draft:candidate})
 check(proposed.status===200&&proposed.json.requires_review===true&&proposed.json.saved===false&&proposed.json.totals.total_minor===152,'billing_actual_normalized_proposal')
 check((await invoke('invoice_list',{})).json.items.length===0,'billing_actual_proposal_no_invoice')
 const draft=await invoke('invoice_create_draft',input);check(draft.status===200&&draft.json.version===1,'billing_actual_draft')
 for(const u of [users.memberA,users.viewerA,users.ownerB])check((await invoke('invoice_create_draft',{...input,command_id:randomUUID()},u)).status>=400,'billing_actual_role_denied_'+u.role)
 check((await invoke('invoice_create_draft',input,users.ownerA,wb)).status>=400,'billing_actual_foreign_workspace_denied')
 const issueInput={command_id:randomUUID(),id:draft.json.id,expected_version:1}
 const issued=await invoke('invoice_issue',issueInput);check(issued.status===200&&issued.json.number.sequence===1,'billing_actual_atomic_issue')
 check(JSON.stringify((await invoke('invoice_issue',issueInput)).json)===JSON.stringify(issued.json),'billing_actual_issue_replay')
 const conflict=await invoke('invoice_issue',{...issueInput,command_id:randomUUID()});check(conflict.status>=400&&conflict.json.code==='40001','billing_actual_issue_cas')
 const record=await invoke('invoice_get',{id:draft.json.id});check(record.status===200&&record.json.invoice.totals.total_minor===152&&record.json.invoice.issuer.tax_id==='SYNTHETIC-NOT-VALID','billing_actual_get_snapshot_money')
 check((await invoke('invoice_trash',{command_id:randomUUID(),id:draft.json.id,expected_version:2})).status>=400,'billing_actual_issued_not_trashed')
 check((await invoke('invoice_mark_paid',{command_id:randomUUID(),id:draft.json.id,expected_version:2})).json.status==='paid','billing_actual_paid')
 check((await invoke('invoice_financial_summary',{period:'all'})).json.currencies[0].paid_minor===152,'billing_actual_finance')
 const cookies=[];const ssr=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}})
 await ssr.auth.setSession({access_token:users.ownerA.token,refresh_token:users.ownerA.refresh})
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 const r=await fetch(appUrl+'/api/billing/v1/queries',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:'invoice.get',input:{id:draft.json.id}}),signal:AbortSignal.timeout(15000)})
 check(r.status===200&&(await r.json()).data.invoice.totals.total_minor===152,'billing_actual_next_cookie_get')
 const pdf=await fetch(appUrl+'/api/billing/v1/pdf',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:'invoice.pdf',input:{id:draft.json.id}}),signal:AbortSignal.timeout(15000)})
 const pdfBytes=new Uint8Array(await pdf.arrayBuffer())
 check(pdf.status===200&&pdf.headers.get('content-type')==='application/pdf'&&pdf.headers.get('cache-control')==='no-store'&&new TextDecoder().decode(pdfBytes.slice(0,8)).startsWith('%PDF-'),'billing_actual_pdf_authorized_snapshot')
 const dashboard=await rpc('product_v1_dashboard_v2',{p_workspace_id:wa,p_input:{audience:'workspace',period:'all'}},users.ownerA.token)
 check(dashboard.status===200&&dashboard.json.financial_status==='available'&&dashboard.json.financial.currencies[0].paid_minor===152,'billing_actual_dashboard_finance')
 const searchInput={p_workspace_id:wa,p_input:{query:'A/2026/000001'}}
 const ownerSearch=await rpc('product_v1_global_search',searchInput,users.ownerA.token)
 check(ownerSearch.status===200&&ownerSearch.json.items.some(i=>i.kind==='invoice'&&i.id===draft.json.id&&i.status==='paid'),'billing_actual_invoice_search')
 for(const u of [users.memberA,users.viewerA]){const r=await rpc('product_v1_global_search',searchInput,u.token);check(r.status===200&&!r.json.items.some(i=>i.kind==='invoice'),'billing_actual_commercial_invoice_search_hidden')}
 const fiscal=await rpc('product_v1_global_search',{p_workspace_id:wa,p_input:{query:'SYNTHETIC-NOT-VALID'}},users.ownerA.token)
 check(fiscal.status===200&&fiscal.json.items.length===0,'billing_actual_fiscal_not_search_corpus')
 const privateKeys=['tax_id','total_minor','issuer','customer_fiscal','email','phone']
 check(!privateKeys.some(k=>JSON.stringify(ownerSearch.json).includes(k)),'billing_actual_invoice_search_closed_DTO')
 const nextSearch=await fetch(appUrl+'/api/product/v1/queries',{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:'global.search',input:{query:'A/2026/000001'}}),signal:AbortSignal.timeout(15000)})
 check(nextSearch.status===200&&(await nextSearch.json()).data.items.some(i=>i.kind==='invoice'&&i.id===draft.json.id),'billing_actual_next_invoice_search')
 return {billing_search:'PASS',billing_pdf:'PASS',billing_dashboard:'PASS',billing_commands:'PASS',billing_snapshots:'PASS',billing_money:'PASS',billing_transport:'PASS'}
}
