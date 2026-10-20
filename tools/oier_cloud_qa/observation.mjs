import {origin,projectRef} from './preflight.mjs'
const routes=new Set(['/','/login','/dashboard','/clients','/facturacion','/api/product/v1/queries','/api/product/v1/commands','/api/billing/v1','/auth/v1/token','/auth/v1/logout','/auth/v1/user'])
/** Deliberately no raw URL/query/body/headers/errors/IDs/credentials in the result. */
export function safeResponseObservation(url,method,status,contentType){
 let parsed
 try{parsed=new URL(url)}catch{return null}
 if(![origin,`https://${projectRef}.supabase.co`,'https://app.netlify.com'].includes(parsed.origin))return null
 const path=routes.has(parsed.pathname)?parsed.pathname:/^\/clients\/[0-9a-f-]{36}$/.test(parsed.pathname)?'/clients/:synthetic-id':parsed.origin==='https://app.netlify.com'?'/NETLIFY_ACCESS':'/OTHER_REDACTED'
 return {service:parsed.origin===origin?'CRM':parsed.origin==='https://app.netlify.com'?'NETLIFY_ACCESS':'SUPABASE_AUTH_OR_DATA',path,method:['GET','HEAD','POST','OPTIONS','PUT','PATCH','DELETE'].includes(method)?method:'OTHER',http:Number.isInteger(status)&&status>=100&&status<=599?status:null,responseType:/^application\/json(?:;|$)/i.test(contentType??'')?'JSON':/^text\/html(?:;|$)/i.test(contentType??'')?'HTML':'OTHER'}
}
