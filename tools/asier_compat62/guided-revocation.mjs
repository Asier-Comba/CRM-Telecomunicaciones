import {createServerClient} from '@supabase/ssr'
import {expect} from '@playwright/test'
import {responseForAction} from './response-action.mjs'

// An oracle control, never an Auth acceptance result by itself.
export function assertGuidedRevocationProof(p){
  if(p.status!==403)throw Error('GUIDED_REVOCATION_EXPECTED_403')
  if(p.denialCode!=='access_denied')throw Error('GUIDED_REVOCATION_DENIAL_ENVELOPE')
  if(p.correlated!==true||p.requests!==1)throw Error('GUIDED_REVOCATION_REQUEST_CORRELATION')
  if(p.customerPresent!==true||p.suspended!==true)throw Error('GUIDED_REVOCATION_FIXTURE_NOT_PROVEN')
  if(p.jwtValid!==true||p.unexpired!==true)throw Error('GUIDED_REVOCATION_JWT_NOT_PROVEN')
  for(const v of [p.before,p.after]){
    if(!v||!['invoices','lines','customer'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0))throw Error('GUIDED_REVOCATION_COUNTS_UNAVAILABLE')
  }
  if(p.before.customer!==0||p.after.customer!==0||p.before.invoices!==p.after.invoices||p.before.lines!==p.after.lines)throw Error('GUIDED_REVOCATION_UNEXPECTED_EFFECT')
  return Object.freeze({contract:'commercial.guided-revocation.v1',result:'PASS',status:403,requests:1,jwt_valid:true,invoice_delta:0,line_delta:0})
}

/** Hold one real UI command, revoke only its synthetic membership, then continue
 * the unchanged request to the actual server. No fulfilled/mock response, retry,
 * HTTP relaxation, token logging, tracing or hosted access is permitted here. */
export async function revokedGuidedSave(c,{page,customerId,opportunityId,save,report}){
  const {origin,url,anon,sql,wa,users,check}=c,actor=users.ownerA.id
  const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||origin!=='http://127.0.0.1:3182'||url!=='http://127.0.0.1:54321'||![wa,actor,customerId,opportunityId].every(uuid))throw Error('GUIDED_REVOCATION_DISPOSABLE_ONLY')
  const member=()=>sql(`select status from public.workspace_members where workspace_id='${wa}' and user_id='${actor}'`)
  const counts=()=>{
    // Global counts also detect a misplaced insert in synthetic tenant B.
    const values=sql(`select (select count(*) from public.billing_invoices)||'|'||(select count(*) from public.billing_invoice_lines)||'|'||(select count(*) from public.billing_invoices where customer_id='${customerId}')`).split('|')
    if(values.length!==3||!values.every(v=>/^\d+$/.test(v)))throw Error('GUIDED_REVOCATION_COUNTS_UNAVAILABLE')
    return{invoices:Number(values[0]),lines:Number(values[1]),customer:Number(values[2])}
  }
  const customerPresent=sql(`select count(*) from public.customers where id='${customerId}' and workspace_id='${wa}'`)==='1',before=counts()
  check(customerPresent&&member()==='active'&&before.customer===0,'browser_guided_revocation_active_fixture_before_save')
  const endpoint=origin+'/api/billing/v1/commands'
  let request,commandId,session,client,held,requests=0,attempted=false,handlerError
  const handler=async route=>{
    held=route
    try{
      const r=route.request(),body=r.postDataJSON();requests++
      if(requests!==1||r.method()!=='POST'||body?.operation!=='invoice.create_draft'||body.input?.customer_id!==customerId||body.input?.opportunity_id!==opportunityId||!uuid(body.input?.command_id))throw Error('GUIDED_REVOCATION_REQUEST_CORRELATION')
      request=r;commandId=body.input.command_id
      // Read the JWT from THIS held request's cookies, not a different login.
      const cookie=await r.headerValue('cookie')
      if(!cookie)throw Error('GUIDED_REVOCATION_COOKIE_REQUIRED')
      const cookies=cookie.split(';').map(value=>{const i=value.indexOf('=');return{name:value.slice(0,i).trim(),value:value.slice(i+1)}})
      client=createServerClient(url,anon,{cookies:{getAll:()=>cookies,setAll:()=>{throw Error('GUIDED_REVOCATION_REFRESH_FORBIDDEN')}}})
      const current=await client.auth.getSession();session=current.data?.session
      if(current.error||!session?.access_token||!Number.isFinite(session.expires_at)||session.expires_at<=Date.now()/1000+60)throw Error('GUIDED_REVOCATION_JWT_NOT_PROVEN')
      attempted=true
      if(sql(`update public.workspace_members set status='suspended' where workspace_id='${wa}' and user_id='${actor}' and status='active' returning status`)!=='suspended'||member()!=='suspended')throw Error('GUIDED_REVOCATION_FIXTURE_NOT_PROVEN')
      await route.continue();held=null
    }catch{handlerError='GUIDED_REVOCATION_BARRIER_FAILED';await route.abort().catch(()=>{});held=null}
  }
  await page.route(endpoint,handler)
  try{
    const response=await responseForAction(()=>page.waitForResponse(r=>r.request()===request),save)
    if(handlerError)throw Error(handlerError)
    const identity=await client.auth.getUser(session.access_token)
    const body=await response.json().catch(()=>null)
    const denialCode=body?.ok===false&&Object.keys(body).sort().join(',')==='error,ok'?body.error:null
    const proof={status:response.status(),denialCode,correlated:response.request()===request,requests,customerPresent,suspended:member()==='suspended',jwtValid:!identity.error&&identity.data.user?.id===actor,unexpired:session.expires_at>Date.now()/1000,before,after:counts()}
    report.guided_revocation=assertGuidedRevocationProof(proof)
    await expect(page.getByRole('alert').filter({hasText:'No tienes permiso para esta acción.'}).first()).toBeVisible()
    check(true,'browser_guided_revocation_real_403_valid_browser_jwt_zero_invoice_and_lines')
    return{deniedCommandId:commandId,before}
  }catch(error){if(handlerError)throw Error(handlerError);throw error}
  finally{
    if(held)await held.abort().catch(()=>{})
    try{await page.unroute(endpoint,handler)}finally{
      if(attempted){
        const status=member()
        if(status==='suspended')sql(`update public.workspace_members set status='active' where workspace_id='${wa}' and user_id='${actor}' and status='suspended'`)
        check(member()==='active','browser_guided_revocation_only_fixture_restored')
      }
    }
  }
}
