import{randomUUID}from'node:crypto'
export async function fullWorkCollectionsAcceptance({rpc,sql,check,http,users,wa,url,anon,appUrl}){
 const{createServerClient}=await import('@supabase/ssr');const cookies={}
 for(const name of['memberA','viewerA','ownerB']){const values=[],c=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>values.push(...v)}});check(!(await c.auth.setSession({access_token:users[name].token,refresh_token:users[name].refresh})).error,'work_pages_cookie_'+name);cookies[name]=values.map(c=>c.name+'='+c.value).join('; ')}
 const post=async(op,input,name='memberA')=>{const r=await fetch(appUrl+'/api/product/v1/queries',{method:'POST',headers:{cookie:cookies[name],origin:appUrl,'content-type':'application/json'},body:JSON.stringify({operation:op,input}),signal:AbortSignal.timeout(30000)});check(r.headers.get('cache-control')==='no-store','work_pages_no_store_'+op);return{status:r.status,json:await r.json()}}
 const call=async(name,input)=>{const r=await rpc(name,{p_workspace_id:wa,p_input:input},users.memberA.token);check(r.status===200,'work_pages_normal_'+name);return r.json}
 const customer=await call('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'TEL5 Synthetic Full Work Account'}),u=users.memberA.id
 const first=await call('product_v1_task_create',{command_id:randomUUID(),customer_id:customer.id,title:'Synthetic Undated Pending',assigned_user_id:u})
 const completed=await call('product_v1_task_create',{command_id:randomUUID(),customer_id:customer.id,title:'Synthetic Undated Completed',assigned_user_id:u})
 await call('product_v1_task_complete',{command_id:randomUUID(),id:completed.id,expected_version:1})
 const instant=new Date(Date.now()-2*86400000).toISOString(),dated=await call('product_v1_task_create',{command_id:randomUUID(),customer_id:customer.id,title:'Synthetic Dated Task',due_at:instant,priority:'high',assigned_user_id:u})
 const old=await call('product_v1_meeting_create',{command_id:randomUUID(),customer_id:customer.id,title:'Synthetic Historical Meeting',starts_at:instant,timezone:'Europe/Madrid',assigned_user_id:u})
 await call('product_v1_meeting_complete',{command_id:randomUUID(),id:old.id,expected_version:1})
 const future=await call('product_v1_meeting_create',{command_id:randomUUID(),customer_id:customer.id,title:'Synthetic Future Meeting',starts_at:new Date(Date.now()+2*86400000).toISOString(),timezone:'Europe/Madrid',assigned_user_id:u})
 const observed=[]
 for(const[op,expected]of[['task.list',[first.id,completed.id,dated.id]],['meeting.list',[old.id,future.id]]]){
 const input={customer_id:customer.id},full=await post(op,input);check(full.status===200&&full.json.data.items.length===expected.length,'work_pages_individually_observed_'+op);observed.push(op)
 check(full.json.data.items.every(x=>expected.includes(x.id)),'work_pages_exact_ids_'+op)
 let after={},seen=[];for(let n=0;n<10;n++){const r=await post(op,{...input,limit:1,...after});check(r.status===200,'work_pages_cursor_'+op);seen.push(...r.json.data.items.map(x=>x.id));if(r.json.data.next_id===null)break;after={after_id:r.json.data.next_id}}
 check(seen.length===expected.length&&new Set(seen).size===expected.length,'work_pages_complete_no_duplicates_'+op)
 check((await post(op,input,'viewerA')).status===200,'work_pages_viewer_'+op);const foreign=await post(op,input,'ownerB');check(foreign.status===200&&foreign.json.data.items.length===0,'work_pages_foreign_empty_'+op)
 const filter=await post(op,{...input,status:op==='task.list'?'completed':'completed',assigned_user_id:u});check(filter.status===200&&filter.json.data.items.length===1&&filter.json.data.items[0].id===(op==='task.list'?completed.id:old.id),'work_pages_history_filter_'+op)
 }
 const tasks=await post('task.list',{customer_id:customer.id});check(tasks.json.data.items.filter(x=>x.due_at===null&&x.due_on===null).length===2,'work_pages_undated_included')
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));const day=[parts.year,parts.month,parts.day].join('-')
 const dateFilter=await post('task.list',{customer_id:customer.id,date_from:day,date_to:day});check(dateFilter.status===200&&dateFilter.json.data.items.length===1&&dateFilter.json.data.items[0].id===dated.id,'work_pages_madrid_date_filter')
 check((await post('task.list',{priority:'urgent'})).status===400,'work_pages_closed_priority');check((await post('meeting.list',{date_from:day})).status===400,'work_pages_paired_dates')
 sql(`update public.workspace_members set status='suspended'where workspace_id='${wa}'and user_id='${u}';`);check((await http('/auth/v1/user',users.memberA.token)).status===200,'work_pages_revoked_jwt_valid')
 for(const op of observed){check((await post(op,{customer_id:customer.id})).status===403,'work_pages_same_cookie_revoked_'+op);check((await rpc('telecom_collection_v1_query',{p_workspace_id:wa,p_operation:op,p_input:{}},users.memberA.token)).status===403,'work_pages_same_jwt_revoked_'+op)}
 sql(`update public.workspace_members set status='active'where workspace_id='${wa}'and user_id='${u}';`)
 return{full_work_collection_operations_individually_observed:observed,customer360_work_pages:'PASS_UNDATED_TASKS_ALL_HISTORY_UUID_KEYSET_FILTERS_VIEWER_VALID_JWT_REVOCATION'}
}
