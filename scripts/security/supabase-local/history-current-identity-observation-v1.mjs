import {identityCursor} from '../../../src/features/customers/customer-identity.ts'
import {parseTelecomCollectionInputV1,parseTelecomCollectionResultV1} from '../../../src/lib/server/telecom-collection-runtime-v1.ts'

/** Passive observer of one exact synthetic document/ordinary identity cursor.
 * No URLs/IDs/body/headers/error text in output, no auth or RCA claim. */
export function observeHistoryCurrentIdentityV1({page,destination,customerId}){
 let target,cursor
 try{target=new URL(destination);if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.pathname!=='/assistant'||target.username||target.password
  ||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)||target.searchParams.get('customer')!==customerId)return null;cursor=identityCursor(customerId)}catch{return null}
 const frame=page.mainFrame(),rows=new Map();let entered=false,changed=false,finished=false,truncated=false
 const navigated=f=>{if(f!==frame)return;if(!entered&&page.url()===destination){entered=true;return}if(entered)changed=true}
 const request=req=>{try{
  if(finished||changed||page.url()!==destination||req.frame()!==frame||req.method()!=='POST')return
  const url=new URL(req.url());if(url.origin!==target.origin||url.pathname!=='/api/product/v1/queries')return
  const data=req.postDataJSON(),input=data?.input
  if(data?.operation!=='customer.list'||input?.limit!==1||input.sort!=='id_asc'||input.after_id!==(cursor.previous??undefined)
   ||Object.keys(input).sort().join(',')!==(cursor.previous?'after_id,limit,sort':'limit,sort'))return
  if(rows.size>=12){truncated=true;return}
  rows.set(req,{status:'pending',failed:false,envelope:'not_observed',dto:'not_observed',error:null,items:null,exact_reference:null})
 }catch{}}
 const response=async res=>{const row=rows.get(res.request());if(!row||finished||changed||page.url()!==destination)return
  const status=res.status();row.status=status===200?'ok':status===403?'denied':status>=400&&status<500?'client_error':status>=500&&status<600?'server_error':'other'
  try{
   const body=await res.json();if(finished||changed||page.url()!==destination)return
   if(!body||typeof body!=='object'||Array.isArray(body)){row.envelope='invalid';return}
   if(body.ok===false){row.envelope='failure';if(['validation','access_denied','not_found','conflict','unavailable','internal_safe'].includes(body.error))row.error=body.error;return}
   if(body.ok!==true||Object.keys(body).sort().join(',')!=='data,ok'){row.envelope='invalid';return}
   row.envelope='ok'
   const input=parseTelecomCollectionInputV1('customer.list',{limit:1,sort:'id_asc',...(cursor.previous?{after_id:cursor.previous}:{})})
   const data=input&&parseTelecomCollectionResultV1('customer.list',input,body.data);row.dto=data?'valid':'invalid'
   if(data){row.items=data.items.length;row.exact_reference=data.items.some(item=>item.id===cursor.key)}
  }catch{if(!finished&&!changed)row.envelope='unavailable'}
 }
 const failed=req=>{const row=rows.get(req);if(row&&!finished&&!changed)row.failed=true}
 const handlers={request,response,requestfailed:failed,framenavigated:navigated}
 for(const[event,handler]of Object.entries(handlers))page.on(event,handler)
 return{finish(){if(finished)return null;finished=true;for(const[event,handler]of Object.entries(handlers))page.off(event,handler)
  const summary={contract:'w3.history-current-identity-observation.v1',scope:'CURRENT_SYNTHETIC_MAIN_DOCUMENT_ONLY_NO_AUTHORIZATION_OR_CAUSE_CLAIM',
   document_changed:changed||page.url()!==destination,truncated,rows:changed||page.url()!==destination?[]:[...rows.values()].map(row=>({...row}))}
  rows.clear();return summary
 }}
}
