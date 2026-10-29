import {authOrigin,authEndpoint} from './policy.mjs'

export function safeAuthLocation(value){
 try{
  const url=new URL(value)
  const path=['/login','/auth/callback','/reset-password','/auth/v1/verify'].includes(url.pathname)?url.pathname:'OTHER'
  const hash=new URLSearchParams(url.hash.replace(/^#/,'')),flow=url.searchParams.get('type')||hash.get('type')
  return{origin:url.origin===authOrigin?'APP_LOOPBACK':url.origin===authEndpoint?'AUTH_LOOPBACK':'OTHER',path,has_query:!!url.search,has_hash:!!url.hash,has_session_tokens:hash.has('access_token')||hash.has('refresh_token'),has_code:url.searchParams.has('code')||hash.has('code'),has_error:['error','error_description'].some(key=>hash.has(key)||url.searchParams.has(key)),flow:['invite','recovery','signup'].includes(flow)?flow:'OTHER'}
 }catch{return{origin:'INVALID',path:'OTHER'}}
}

export function safeAuthResponse(url,status,location){
 let parsed;try{parsed=new URL(url)}catch{return null}
 if(parsed.origin!==authEndpoint)return null
 const kind={'/auth/v1/verify':'VERIFY','/auth/v1/user':'USER','/auth/v1/token':'TOKEN'}[parsed.pathname]
 if(!kind)return null
 return{kind,status:Number.isInteger(status)&&status>=100&&status<=599?status:null,...(location?{redirect:safeAuthLocation(location)}:{})}
}
