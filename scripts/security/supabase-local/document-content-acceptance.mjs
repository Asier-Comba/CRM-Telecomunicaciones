import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
/** Real synthetic USER-JWT/Storage/SSR transport; no service-role content writes. */
export async function documentContentAcceptance({rpc,sql,check,http,users,wa,wb,ca,cb,url,anon,appUrl}){
 const call=(op,input,u=users.ownerA,w=wa)=>rpc('document_content_v1_'+op,{p_workspace_id:w,p_input:input},u.token)
 const bytes=Buffer.from('%PDF-1.7\nSynthetic private upload acceptance only\n%%EOF\n')
 const input={command_id:randomUUID(),target_kind:'customer',target_id:ca,document_kind:'general',file_name:'Synthetic.pdf',media_type:'application/pdf',size_bytes:bytes.length}
 const requests=await Promise.all(Array.from({length:20},()=>call('request_upload',input)))
 check(requests.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(requests[0].json)),'content20_same_upload_intent_replays')
 const id=requests[0].json.id;check(requests[0].json.status==='pending'&&!/(storage_path|object_ref|file_name|sha256)/.test(JSON.stringify(requests[0].json)),'content_pending_opaque_intent')
 check(Number(sql(`select count(*)from public.documents where id='${id}'`))===1,'content_one_pending_metadata')
 const finalize={command_id:randomUUID(),id,expected_version:1}
 check((await call('finalize_upload',finalize)).status===400,'content_missing_object_not_finalized')
 check(Number(sql(`select count(*)from public.product_commands where command_id='${finalize.command_id}'`))===0,'content_failed_finalize_no_reservation')
 check((await call('request_upload',{...input,size_bytes:input.size_bytes+1})).json.code==='40001','content_changed_intent_conflict')
 check((await call('request_upload',{...input,storage_path:'arbitrary'})).status===400,'content_caller_path_denied')
 const foreignTarget=await call('request_upload',{...input,command_id:randomUUID(),target_id:cb})
 check(foreignTarget.status>=400&&foreignTarget.json?.code==='P0002','content_foreign_target_denied')
 for(const u of [users.memberA,users.viewerA,users.ownerB])check((await call('request_upload',input,u)).status===403,'content_role_and_tenant_denied')
 const foreignManifest=await call('manifest',{id},users.ownerB,wb)
 check(foreignManifest.status>=400&&foreignManifest.json?.code==='P0002','content_foreign_scoped_manifest_hidden')
 const manifest=await call('manifest',{id});check(manifest.status===200&&manifest.json.size_bytes===bytes.length&&!JSON.stringify(manifest.json).includes('storage_path'),'content_pending_manifest_scoped')
 const path=wa+'/documents/'+id+'/'+manifest.json.object_ref
 for(const u of [users.adminA,users.memberA,users.viewerA,users.ownerB])check((await http('/storage/v1/object/telecom-documents/'+path,u.token,'POST',bytes,'application/pdf')).status>=400,'content_other_actor_storage_insert_denied')
 check((await http('/storage/v1/object/telecom-documents/'+path+'/forged',users.ownerA.token,'POST',bytes,'application/pdf')).status>=400,'content_arbitrary_storage_path_denied')
 const upload=await http('/storage/v1/object/telecom-documents/'+path,users.ownerA.token,'POST',bytes,'application/pdf');check(upload.status<300,'content_real_user_jwt_pending_storage_upload')
 check((await http('/storage/v1/object/telecom-documents/'+path,users.ownerA.token,'PUT',bytes,'application/pdf')).status>=400,'content_storage_replace_denied')
 const attempts=await Promise.all(Array.from({length:20},()=>call('finalize_upload',finalize)))
 check(attempts.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(attempts[0].json)),'content20_same_finalize_replays')
 check(attempts[0].json.status==='active'&&attempts[0].json.version===2,'content_real_object_finalized')
 check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===2,'content_two_atomic_audits')
 check((await call('finalize_upload',{...finalize,expected_version:2})).json.code==='40001','content_changed_finalize_conflict')
 const cookies=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}})
 check(!(await client.auth.setSession({access_token:users.ownerA.token,refresh_token:users.ownerA.refresh})).error,'content_real_cookie_session')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 const post=async(kind,operation,input)=>{const r=await fetch(appUrl+'/api/document/v1/content/'+kind,{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(15000)});const buf=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(buf)}catch{}return{status:r.status,json,bytes:buf,headers:r.headers}}
 check((await post('commands','document.request_upload',{...input,command_id:randomUUID(),target_id:cb})).status===404,'content_next_foreign_target_not_found')
 const ticket=(await post('commands','document.request_download',{command_id:randomUUID(),id,expected_version:2}));check(ticket.status===200&&!!ticket.json.receipt.ticket_id,'content_next_download_ticket')
 const t=ticket.json.receipt.ticket_id,download=await post('download','document.download',{id,ticket_id:t})
 check(download.status===200&&download.bytes.equals(bytes)&&download.headers.get('cache-control')==='no-store'&&download.headers.get('content-disposition').startsWith('attachment'),'content_next_exact_private_download')
 await rpc('document_v1_archive',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id,expected_version:2}},users.ownerA.token)
 check((await post('download','document.download',{id,ticket_id:t})).status===403,'content_archive_revokes_existing_proxy_ticket')
 check((await call('request_download',{command_id:randomUUID(),id,expected_version:3})).status===403,'content_archived_new_ticket_denied')
 await rpc('document_v1_restore',{p_workspace_id:wa,p_input:{command_id:randomUUID(),id,expected_version:3}},users.ownerA.token)
 sql(`update public.document_download_tickets set expires_at=statement_timestamp()-interval '1 second'where id='${t}'`)
 check((await post('download','document.download',{id,ticket_id:t})).status===403,'content_ticket_expiry_denied')
 const fresh=await call('request_download',{command_id:randomUUID(),id,expected_version:4});check(fresh.status===200,'content_restore_new_ticket')
 check((await call('manifest',{id,ticket_id:fresh.json.ticket_id},users.adminA)).status===403,'content_ticket_actor_binding')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 check((await http('/auth/v1/user',users.ownerA.token)).status===200&&(await call('request_upload',input)).status===403,'content_valid_jwt_revoked_replay')
 check((await post('download','document.download',{id,ticket_id:fresh.json.ticket_id})).status===403,'content_valid_jwt_revoked_ticket')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 // A second object proves the actual cookie upload route and orphan expiry behavior.
 const second=await post('commands','document.request_upload',{...input,command_id:randomUUID()});check(second.status===200,'content_next_pending_intent')
 const id2=second.json.receipt.id,send=async data=>{const r=await fetch(appUrl+'/api/document/v1/content/upload?id='+id2,{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/pdf'},body:data,signal:AbortSignal.timeout(15000)});return{status:r.status,json:await r.json()}}
 check((await send(bytes)).status===200&&(await send(bytes)).status===200,'content_next_same_byte_upload_retry')
 const changed=Buffer.from(bytes);changed[0]^=1;check((await send(changed)).status===409,'content_next_changed_byte_retry_conflict')
 sql(`update public.document_upload_intents set created_at=statement_timestamp()-interval '20 minutes',expires_at=statement_timestamp()-interval '1 second'where document_id='${id2}'`)
 check((await post('commands','document.finalize_upload',{command_id:randomUUID(),id:id2,expected_version:1})).status===403,'content_expired_orphan_never_finalized')
 check(sql(`select status from public.documents where id='${id2}'`)==='pending','content_expired_orphan_remains_pending')
 return{document_upload:'PASS',document_finalize:'PASS',document_proxy_download:'PASS',document_content_revocation:'PASS',document_content_expiry:'PASS',document_content_transport:'PASS',document_content_scan:'NOT_IMPLEMENTED',document_content_verified_sha256:'NOT_IMPLEMENTED'}
}
