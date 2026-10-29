import {productStagingErrors} from '../../../scripts/platform/product-staging-profile.mjs'
import {createPrivateSupabaseFetchV1,privateSupabaseTransportV1} from './product-private-egress-v1.ts'

type Environment=Readonly<Record<string,string|undefined>>
/** Provider connectivity only; never identity, authorization or release acceptance. */
export async function productReadinessV1(env:Environment,fetchImpl:typeof fetch=fetch):Promise<boolean>{
 const url=env.NEXT_PUBLIC_SUPABASE_URL
 const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!url||!key)return false
 try{
  if(env.PLATFORM_TARGET==='LOCAL'){
   const endpoint=new URL(url)
   if(endpoint.origin!==url||endpoint.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname))return false
   const response=await fetchImpl(url+'/rest/v1/',{headers:{apikey:key,authorization:`Bearer ${key}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)})
   return response.ok
  }
  if(env.PLATFORM_TARGET!=='STAGING'||privateSupabaseTransportV1(env)!=='gateway'||productStagingErrors(env).length)return false
  const transport=createPrivateSupabaseFetchV1(fetchImpl)
  const response=await transport(url+'/rest/v1/',{method:'HEAD',headers:{apikey:key},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)})
  return response.ok
 }catch{return false}
}
