import {authEndpoint,authOrigin} from './policy.mjs'

export const localMailOrigin='http://127.0.0.1:54324'
export const excludedWithoutMail='realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor'
export async function readLocalMailJson(path,fetcher=fetch){
 if(!/^\/api\/v1\/(messages|message\/[A-Za-z0-9_-]{1,128})$/.test(path))throw Error('D1_GLOBAL_AUTH_PKCE_MAIL_READ_INVALID')
 const response=await fetcher(localMailOrigin+path,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)})
 if(response.status!==200||!response.body)throw Error('D1_GLOBAL_AUTH_PKCE_MAIL_READ_FAILED')
 const reader=response.body.getReader(),chunks=[];let size=0
 try{
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>131072)throw Error('D1_GLOBAL_AUTH_PKCE_MAIL_TOO_LARGE');chunks.push(Buffer.from(part.value))}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
 }finally{await reader.cancel();reader.releaseLock()}
}
export function pkceScopeGuard(env){
 const selected=env.DOCUMENTS_GLOBAL_SCOPE==='AUTH_PKCE_ONLY'
 if(selected&&env.AUTH_PKCE_ACCEPTANCE!=='true')throw Error('D1_GLOBAL_AUTH_PKCE_OPT_IN_REQUIRED')
 if((selected&&env.AUTH_RECOVERY_ACCEPTANCE==='true')||(!selected&&env.AUTH_PKCE_ACCEPTANCE==='true'))throw Error('D1_GLOBAL_AUTH_PKCE_MIXED_SCOPE')
 return selected
}

function environment(container){
 const result=new Map()
 if(!Array.isArray(container?.Config?.Env))throw Error('D1_GLOBAL_AUTH_PKCE_SMTP_INSPECT_INVALID')
 for(const entry of container.Config.Env){
  if(typeof entry!=='string'||!entry.includes('='))throw Error('D1_GLOBAL_AUTH_PKCE_SMTP_INSPECT_INVALID')
  const split=entry.indexOf('='),key=entry.slice(0,split)
  if(result.has(key))throw Error('D1_GLOBAL_AUTH_PKCE_SMTP_INSPECT_INVALID')
  result.set(key,entry.slice(split+1))
 }
 return result
}

// Readback from this fresh disposable CLI resource, before any recovery email.
// Values stay private in Node; callers may record only a boolean check result.
export function assertLocalMailTransport(containers){
 if(!Array.isArray(containers)||containers.length!==2)throw Error('D1_GLOBAL_AUTH_PKCE_SMTP_INSPECT_INVALID')
 const auth=containers.find(c=>c.Name==='/supabase_auth_crm-telecom-local')
 const mail=containers.find(c=>c.Name==='/supabase_inbucket_crm-telecom-local')
 if(!auth||!mail||auth.State?.Running!==true||mail.State?.Running!==true||mail.State?.Health?.Status!=='healthy')throw Error('D1_GLOBAL_AUTH_PKCE_LOCAL_MAIL_NOT_READY')
 const a=environment(auth),m=environment(mail),hook=a.get('GOTRUE_HOOK_SEND_EMAIL_ENABLED')
 if(a.get('GOTRUE_SMTP_HOST')!=='supabase_inbucket_crm-telecom-local'||a.get('GOTRUE_SMTP_PORT')!=='1025'||
    a.get('GOTRUE_SMTP_USER')||a.get('GOTRUE_SMTP_PASS')||
    (hook!==undefined&&hook!=='false')||a.get('GOTRUE_HOOK_SEND_EMAIL_URI')||a.get('GOTRUE_HOOK_SEND_EMAIL_SECRETS')||
    [...m].some(([key,value])=>/^MP_(SMTP_RELAY|SMTP_FORWARD|SEND_API)/.test(key)&&value))throw Error('D1_GLOBAL_AUTH_PKCE_EXTERNAL_MAIL_FORBIDDEN')
 const ports=mail.NetworkSettings?.Ports?.['8025/tcp']
 if(!Array.isArray(ports)||!ports.length||ports.some(p=>p.HostPort!=='54324'))throw Error('D1_GLOBAL_AUTH_PKCE_MAIL_PORT_MISMATCH')
 return true
}

export function localRecoveryEmailLink(message,email){
 const reject=()=>{throw Error('D1_GLOBAL_AUTH_PKCE_INVALID_LOCAL_EMAIL')}
 if(!/^pkce-[a-f0-9-]{36}@example\.invalid$/.test(email)||!Array.isArray(message?.To)||message.To.length!==1||message.To[0]?.Address!==email||typeof message.HTML!=='string'||message.HTML.length>65536)reject()
 const links=[...new Set([...message.HTML.matchAll(/href=["']([^"']+)["']/g)].map(match=>match[1].replaceAll('&amp;','&')))]
 if(links.length!==1)reject()
 let link;try{link=new URL(links[0])}catch{reject()}
 if(link.origin!==authEndpoint||link.pathname!=='/auth/v1/verify'||link.username||link.password||link.hash||
    link.searchParams.get('type')!=='recovery'||!link.searchParams.get('token')||link.searchParams.get('redirect_to')!==authOrigin+'/reset-password'||
    [...link.searchParams.keys()].some(key=>!['token','type','redirect_to'].includes(key))||
    ['token','type','redirect_to'].some(key=>link.searchParams.getAll(key).length!==1))reject()
 return link.href
}

export function localPkceCodeRedirect(value){
 let url;try{url=new URL(value)}catch{throw Error('D1_GLOBAL_AUTH_PKCE_REDIRECT_INVALID')}
 if(url.origin!==authOrigin||url.pathname!=='/reset-password'||url.username||url.password||url.hash||
    url.searchParams.getAll('code').length!==1||!url.searchParams.get('code')||[...url.searchParams.keys()].some(key=>key!=='code'))throw Error('D1_GLOBAL_AUTH_PKCE_REDIRECT_INVALID')
 return url.href
}
