import {randomUUID}from 'node:crypto'
import {createServerClient}from '@supabase/ssr'
/** Disposable synthetic private object, used to verify metadata → Storage policy. */
export async function documentAcceptance({rpc,sql,check,http,users,wa,wb,ca,url,anon,service,appUrl}){
 const id=randomUUID(),path=wa+'/documents/'+id+'/'+randomUUID(),bytes=Buffer.from('Synthetic document acceptance only\n')
 check((await http('/storage/v1/object/telecom-documents/'+path,service,'POST',bytes,'application/pdf')).status<300,'document_actual_synthetic_object_setup')
 sql(`insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path)values('${id}','${wa}','${ca}','identity','Sensitive Synthetic.pdf','application/pdf',${bytes.length},'${path}')`)
 const invoke=(op,input,u=users.ownerA,w=wa)=>rpc('document_v1_'+op.replace('document.',''),{p_workspace_id:w,p_input:input},u.token)
 const metadata=await invoke('get_metadata',{id});check(metadata.status===200&&metadata.json.record.id===id&&!/(file_name|storage_path|sha256|Sensitive|signed_url)/.test(JSON.stringify(metadata.json)),'document_actual_closed_metadata')
 const list=await invoke('list',{target_kind:'customer',target_id:ca,limit:100});check(list.status===200&&list.json.items.some(d=>d.id===id),'document_actual_scoped_list')
 for(const u of [users.memberA,users.viewerA,users.ownerB])check((await invoke('get_metadata',{id},u)).status===403,'document_actual_protected_metadata_denied')
 check((await invoke('get_metadata',{id},users.ownerB,wb)).json===null,'document_actual_foreign_id_hidden')
 check((await http('/storage/v1/object/authenticated/telecom-documents/'+path,users.ownerA.token)).status===200,'document_actual_pre_archive_bytes_allowed')
 const edits=await Promise.all(Array.from({length:20},()=>invoke('archive',{command_id:randomUUID(),id,expected_version:1})))
 check(edits.filter(r=>r.status===200).length===1&&edits.filter(r=>r.status===500&&r.json.code==='40001').length===19,'document_actual20_CAS_archive')
 check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===1,'document_actual_one_archive_audit')
 const archived=await http('/storage/v1/object/authenticated/telecom-documents/'+path,users.ownerA.token);check([400,403,404].includes(archived.status),'document_actual_archive_blocks_object_bytes')
 const restore={command_id:randomUUID(),id,expected_version:2},replays=await Promise.all(Array.from({length:20},()=>invoke('restore',restore)))
 check(replays.every(r=>r.status===200&&JSON.stringify(r.json)===JSON.stringify(replays[0].json)),'document_actual20_restore_replays')
 check(Number(sql(`select count(*)from public.product_audit_events where entity_id='${id}'`))===2,'document_actual_two_lifecycle_audits')
 check((await http('/storage/v1/object/authenticated/telecom-documents/'+path,users.ownerA.token)).status===200,'document_actual_restore_reauthorizes_bytes')
 const changed=await invoke('restore',{...restore,expected_version:3});check(changed.status===500&&changed.json.code==='40001','document_actual_changed_replay_conflict')
 const input={command_id:randomUUID(),id,expected_version:3}
 check((await invoke('archive',{...input,storage_path:'arbitrary'})).status===400,'document_actual_arbitrary_path_denied')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 check((await http('/auth/v1/user',users.ownerA.token)).status===200,'document_actual_revoked_JWT_valid')
 const revoked=await invoke('restore',restore);check(revoked.status===403&&revoked.json.code==='42501','document_actual_revoked_replay_denied')
 const denied=await invoke('archive',input);check(denied.status===403&&denied.json.code==='42501','document_actual_revoked_new_write_denied')
 check(Number(sql(`select count(*)from public.product_commands where command_id='${input.command_id}'`))===0,'document_actual_revoked_no_reservation')
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${users.ownerA.id}'`)
 const cookies=[],client=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}})
 check(!(await client.auth.setSession({access_token:users.ownerA.token,refresh_token:users.ownerA.refresh})).error,'document_actual_real_cookie_session')
 const cookie=cookies.map(c=>c.name+'='+c.value).join('; ')
 const post=async(kind,operation,input)=>{const r=await fetch(appUrl+'/api/document/v1/'+kind,{method:'POST',headers:{cookie,origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation,input}),signal:AbortSignal.timeout(15000)});return{status:r.status,json:await r.json()}}
 const next=await post('queries','document.get_metadata',{id});check(next.status===200&&next.json.data.record.version===3,'document_actual_next_metadata')
 const command=await post('commands','document.archive',input);check(command.status===200&&command.json.receipt.version===4,'document_actual_next_archive')
 return{document_metadata:'PASS',document_cas_replay:'PASS',document_storage_lifecycle:'PASS',document_revocation:'PASS',document_transport:'PASS',document_upload:'NOT_IMPLEMENTED',document_signed_access:'NOT_IMPLEMENTED'}
}
