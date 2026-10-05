import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
export async function billingArtifactAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,service,appUrl}){
 const cookieFor=async u=>{const cookies=[],ssr=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}});await ssr.auth.setSession({access_token:u.token,refresh_token:u.refresh});return cookies.map(c=>c.name+'='+c.value).join('; ')}
 const ownerCookie=await cookieFor(users.ownerA)
 const request=(operation,input,cookie=ownerCookie,route='private-pdf')=>fetch(appUrl+'/api/billing/v1/'+route,{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(30000)})
 const invoke=(name,input,u=users.ownerA,w=wa)=>rpc('billing_artifact_v1_'+name,{p_workspace_id:w,p_input:input},u.token)
 const draftResponse=await request('invoice.create_draft',{command_id:randomUUID(),customer_id:ca,issue_on:'2026-10-05',due_on:null,series:'P',currency:'EUR',lines:[{description:'Synthetic frozen private PDF',quantity_milli:1000,unit_price_minor:100,discount_bps:0,tax_bps:0,withholding_bps:0}]},ownerCookie,'commands')
 const draft=await draftResponse.json();check(draftResponse.status===200&&draft.receipt.version===1,'artifact_next_draft')
 const id=draft.receipt.id,issuedResponse=await request('invoice.issue',{command_id:randomUUID(),id,expected_version:1},ownerCookie,'commands'),issued=await issuedResponse.json()
 check(issuedResponse.status===200&&issued.receipt.status==='issued'&&issued.receipt.version===2,'artifact_next_issue_authoritative')
 const refResponse=await request('invoice.private_pdf_reference',{id}),ref=await refResponse.json()
 check(refResponse.status===200&&ref.data.version===1&&ref.data.renderer_version==='billing.snapshot.pdf.v1'&&ref.data.verification_required===true,'artifact_on_issue_private_reference')
 check(!JSON.stringify(ref).match(/storage_path|tax_id|sha256|signedURL|https:/),'artifact_reference_minimized')
 const download=await request('invoice.private_pdf',{id}),bytes=Buffer.from(await download.arrayBuffer())
 check(download.status===200&&download.headers.get('cache-control')==='no-store'&&download.headers.get('content-type')==='application/pdf'&&bytes.subarray(0,5).toString()==='%PDF-','artifact_actual_stored_download')
 const path=sql(`select storage_path from public.documents where id='${ref.data.document_id}'`).trim()
 const stored=await fetch(url+'/storage/v1/object/authenticated/telecom-documents/'+path,{headers:{apikey:anon,authorization:'Bearer '+users.ownerA.token},signal:AbortSignal.timeout(15000)})
 check(stored.status===200&&Buffer.from(await stored.arrayBuffer()).equals(bytes),'artifact_real_storage_bytes')
 const paid=await request('invoice.mark_paid',{command_id:randomUUID(),id,expected_version:2},ownerCookie,'commands');check(paid.status===200,'artifact_paid')
 const afterPaid=await request('invoice.private_pdf',{id});check(afterPaid.status===200&&Buffer.from(await afterPaid.arrayBuffer()).equals(bytes),'artifact_bytes_frozen_after_paid')
 for(const user of [users.memberA,users.viewerA,users.ownerB]){
  const cookie=await cookieFor(user)
  for(const operation of ['invoice.private_pdf_reference','invoice.private_pdf'])check((await request(operation,{id},cookie)).status>=400,'artifact_next_denied_'+operation+'_'+user.role)
  for(const name of ['get','replay','attach'])check((await invoke(name,name==='get'?{id}:{command_id:randomUUID(),id,expected_version:3,expected_artifact_version:1,document_id:ref.data.document_id},user)).status>=400,'artifact_rpc_denied_'+name+'_'+user.role)
 }
 check((await invoke('get',{id},users.ownerA,wb)).status>=400,'artifact_foreign_workspace_denied')
 const archive=await rpc('document_v1_archive',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id:ref.data.document_id,expected_version:2}},users.ownerA.token)
 check(archive.status===200&&(await request('invoice.private_pdf',{id})).status===403,'artifact_archive_denies')
 check((await rpc('document_v1_restore',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id:ref.data.document_id,expected_version:3}},users.ownerA.token)).status===200,'artifact_restore')
 const restored=await request('invoice.private_pdf',{id});check(restored.status===200&&Buffer.from(await restored.arrayBuffer()).equals(bytes),'artifact_restore_same_bytes')
 // Privileged setup only: corrupt synthetic bytes to test the normal download verifier.
 const corrupted=Buffer.from(bytes);corrupted[100]^=1
 check((await http('/storage/v1/object/telecom-documents/'+path,service,'PUT',corrupted,'application/pdf')).status<300,'artifact_synthetic_tamper_setup')
 check((await request('invoice.private_pdf',{id})).status===409,'artifact_corrupted_storage_refused')
 const input={command_id:randomUUID(),id,expected_version:3,expected_artifact_version:1}
 const persisted=await request('invoice.persist_private_pdf',input),receipt=await persisted.json()
 check(persisted.status===200&&receipt.receipt.version===2,'artifact_canonical_repair_new_revision')
 const replays=await Promise.all(Array.from({length:20},async()=>{const r=await request('invoice.persist_private_pdf',input);return{status:r.status,json:await r.json()}}))
 check(replays.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(receipt)),'artifact_twenty_exact_replays')
 check((await request('invoice.persist_private_pdf',{...input,expected_artifact_version:2})).status===409,'artifact_changed_intent_conflict')
 const verified=await request('invoice.private_pdf',{id});check(verified.status===200&&Buffer.from(await verified.arrayBuffer()).equals(bytes),'artifact_repaired_authoritative_bytes')
 check(Number(sql(`select count(*)from public.billing_private_pdf_artifacts where invoice_id='${id}'`).trim())===2,'artifact_immutable_revision_count')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 check((await request('invoice.private_pdf',{id})).status===403,'artifact_live_valid_JWT_revocation')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 return{billing_private_artifact:'PASS',billing_private_artifact_storage:'PASS',billing_private_artifact_integrity:'PASS',billing_private_artifact_on_issue:'PASS',billing_private_artifact_revocation:'PASS'}
}
