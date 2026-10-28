import {rewriteSupabaseRequest} from './policy.mjs'

// Prepared transport only. No current SDK consumer is changed or activated.
// Public Supabase identity stays canonical; only server HTTP transport changes.
export function createGatewayFetch(fetchImpl=fetch){
 return async(input,init)=>{
  const request=new Request(input,init)
  const destination=rewriteSupabaseRequest(request)
  return fetchImpl(new Request(destination,request),{redirect:'error'})
 }
}
