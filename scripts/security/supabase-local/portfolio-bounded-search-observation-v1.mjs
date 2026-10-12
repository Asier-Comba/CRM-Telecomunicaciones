import {parseGlobalSearchInputV1,parseGlobalSearchV1} from '../../../src/lib/server/product-dashboard-runtime-v2.ts'
import {parsePortfolioGetInputV1,parsePortfolioGetV1} from '../../../src/lib/server/portfolio-runtime-v1.ts'

/** Passive synthetic-lab observer. No request mutation, retry or timing change;
 * summaries never contain URL, query, ID, label, body, header or error text. */
export function observePortfolioBoundedSearchV1({page,origin,query,expectedContractId}){
 let destination
 try{const url=new URL(origin);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password)return null;destination=url.origin+'/portfolio'}catch{return null}
 if(page.url()!==destination||!parseGlobalSearchInputV1({query})||typeof expectedContractId!=='string'||!/^[0-9a-f-]{36}$/.test(expectedContractId))return null
 const frame=page.mainFrame(),rows=new Map();let changed=false,finished=false,truncated=false
 const navigated=f=>{if(f===frame)changed=true}
 const request=req=>{try{
  if(finished||changed||page.url()!==destination||req.frame()!==frame||req.method()!=='POST')return
  const url=new URL(req.url());if(url.origin!==origin||url.pathname!=='/api/product/v1/queries')return
  const data=req.postDataJSON();let kind=null
  if(data?.operation==='global.search'&&data.input?.query===query)kind='search'
  if(data?.operation==='portfolio.get'&&data.input?.kind==='contract'&&data.input?.id===expectedContractId)kind='expected_contract'
  if(!kind)return;if(rows.size>=12){truncated=true;return}
  rows.set(req,{kind,status:'pending',failed:false,dto:'not_observed',expected_reference:null,candidates:null})
 }catch{/* Exotic/foreign request cannot supply evidence. */}}
 const response=async res=>{const row=rows.get(res.request());if(!row||changed||page.url()!==destination||finished)return
  const status=res.status();row.status=status>=200&&status<300?'ok':status>=400&&status<500?'client_error':status>=500&&status<600?'server_error':'other'
  if(status!==200)return
  row.dto='pending'
  try{
   const raw=await res.json();if(changed||page.url()!==destination||finished)return
   if(!raw||raw.ok!==true){row.dto='invalid';return}
   if(row.kind==='search'){
    const data=parseGlobalSearchV1(parseGlobalSearchInputV1({query}),raw.data)
    row.dto=data?'valid':'invalid'
    if(data){row.candidates=data.items.filter(r=>['contract','service','line'].includes(r.kind)).length;row.expected_reference=data.items.some(r=>r.kind==='contract'&&r.id===expectedContractId)}
   }else{
    const input=parsePortfolioGetInputV1({kind:'contract',id:expectedContractId}),data=parsePortfolioGetV1(input,raw.data)
    row.dto=data?'valid':'invalid';row.expected_reference=!!data
   }
  }catch{if(!finished&&!changed)row.dto='unavailable'}
 }
 const failed=req=>{const row=rows.get(req);if(row&&!finished&&!changed)row.failed=true}
 const handlers={request,response,requestfailed:failed,framenavigated:navigated}
 for(const[event,handler]of Object.entries(handlers))page.on(event,handler)
 return{finish(){if(finished)return null;finished=true;for(const[event,handler]of Object.entries(handlers))page.off(event,handler)
  const documentChanged=changed||page.url()!==destination
  const summary={contract:'w2.portfolio-bounded-search-observation.v1',scope:'CURRENT_SYNTHETIC_MAIN_DOCUMENT_ONLY_NO_AUTHORIZATION_OR_CAUSE_CLAIM',document_changed:documentChanged,truncated,
   rows:documentChanged?[]:[...rows.values()].map(row=>({...row}))}
  rows.clear();return summary
 }}
}
