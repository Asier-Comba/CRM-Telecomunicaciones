import {randomUUID} from 'node:crypto'
export function globalDocumentsFixture(users){
 const roles={ownerA:'owner',adminA:'admin',memberA:'member',viewerA:'viewer',ownerB:'owner',emptyOwner:'owner'},uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
 if(JSON.stringify(Object.keys(users).sort())!==JSON.stringify(Object.keys(roles).sort())||Object.entries(roles).some(([name,role])=>!uuid.test(users[name].id)||!uuid.test(users[name].workspace)||users[name].role!==role))throw Error('D1_GLOBAL_INVALID_FIXTURE_USERS')
 if(['adminA','memberA','viewerA'].some(name=>users[name].workspace!==users.ownerA.workspace)||new Set([users.ownerA.workspace,users.ownerB.workspace,users.emptyOwner.workspace]).size!==3)throw Error('D1_GLOBAL_INVALID_FIXTURE_USERS')
 const wa=users.ownerA.workspace,wb=users.ownerB.workspace,wc=users.emptyOwner.workspace
 const customers=[randomUUID(),randomUUID(),randomUUID()],cb=randomUUID(),operator=randomUUID(),contract=randomUUID(),service=randomUUID(),line=randomUUID(),incident=randomUUID(),stage=randomUUID(),opportunity=randomUUID()
 const targets=[{kind:'customer',id:customers[0],column:'customer_id',customer:customers[0]},{kind:'contract',id:contract,column:'contract_id',customer:customers[1]},{kind:'service',id:service,column:'service_id',customer:customers[1]},{kind:'line',id:line,column:'line_id',customer:customers[1]},{kind:'service_case',id:incident,column:'service_case_id',customer:customers[0]},{kind:'opportunity',id:opportunity,column:'opportunity_id',customer:customers[2]}]
 const id=n=>n.toString(16).padStart(8,'0')+'-d100-4000-8000-000000000001'
 const docs=Array.from({length:123},(_,i)=>{const target={...targets[i%6]};if(target.kind==='customer'){target.id=customers[Math.floor(i/6)%3];target.customer=target.id}return{id:id(i+1),target,document_kind:i%2?'contract':'general',media_type:i%3?'application/pdf':'image/png',created_at:new Date(Date.UTC(2026,8,1)+Math.floor(i/2)*1000).toISOString()}})
 const foreign=Array.from({length:3},(_,i)=>id(1001+i)),archived=id(2001)
 const sql=`begin;
 insert into public.workspaces(id,name,slug)values('${wa}','Global Documents Synthetic A','documents-global-a'),('${wb}','Global Documents Synthetic B','documents-global-b'),('${wc}','Global Documents Synthetic Empty','documents-global-empty');
 insert into public.workspace_members(workspace_id,user_id,role,status)values ${Object.values(users).map(u=>`('${u.workspace}','${u.id}','${u.role}','active')`).join(',')};
 ${Object.values(users).map(u=>`update public.profiles set workspace_id='${u.workspace}'where id='${u.id}';`).join('')}
 insert into public.customers(id,workspace_id,account_kind,legal_name,lifecycle,status,source)values ${customers.map((c,i)=>`('${c}','${wa}','legal_entity','Global Synthetic Company ${i+1}','customer','active','manual')`).join(',')},('${cb}','${wb}','legal_entity','Global Synthetic Company B','customer','active','manual');
 insert into public.telecom_operators(id,workspace_id,code,display_name)values('${operator}','${wa}','global-synthetic','Global Synthetic Operator');
 insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,start_date)values('${contract}','${wa}','${customers[1]}','${operator}','2026-09-01');
 insert into public.telecom_services(id,workspace_id,customer_id,contract_id,operator_id,service_kind,display_name)values('${service}','${wa}','${customers[1]}','${contract}','${operator}','mobile','Global Synthetic Service');
 insert into public.telecom_lines(id,workspace_id,service_id)values('${line}','${wa}','${service}');
 insert into public.service_cases(id,workspace_id,customer_id,case_type,title)values('${incident}','${wa}','${customers[0]}','documentation','Global Synthetic Case');
 insert into public.opportunity_stages(id,workspace_id,code,display_name,position)values('${stage}','${wa}','global-synthetic','Global Synthetic Stage',0);
 insert into public.opportunities(id,workspace_id,customer_id,stage_id,title)values('${opportunity}','${wa}','${customers[2]}','${stage}','Global Synthetic Opportunity');
 ${docs.map(d=>`insert into public.documents(id,workspace_id,${d.target.column},document_kind,file_name,media_type,size_bytes,storage_path,created_at,created_by_user_id)values('${d.id}','${wa}','${d.target.id}','${d.document_kind}','PRIVATE_GLOBAL_UNSEARCHABLE.pdf','${d.media_type}',1024,'${wa}/documents/${d.id}/${randomUUID()}','${d.created_at}','${users.ownerA.id}');`).join('\n')}
 insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path,created_by_user_id)values ${foreign.map(d=>`('${d}','${wb}','${cb}','general','FOREIGN_PRIVATE_GLOBAL_UNSEARCHABLE.pdf','application/pdf',1024,'${wb}/documents/${d}/${randomUUID()}','${users.ownerB.id}')`).join(',')};
 insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path,status,archived_at,created_by_user_id)values('${archived}','${wa}','${customers[0]}','general','PRIVATE_GLOBAL_ARCHIVED.pdf','application/pdf',1024,'${wa}/documents/${archived}/${randomUUID()}','archived',now(),'${users.ownerA.id}');
 commit;`
 return{wa,wb,wc,customers,cb,targets,docs,foreign,archived,sql}
}
