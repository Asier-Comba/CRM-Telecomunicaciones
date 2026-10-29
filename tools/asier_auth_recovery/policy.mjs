export const authOrigin='http://127.0.0.1:3000'
export const authEndpoint='http://127.0.0.1:54321'

// Node-only generated links must remain in the disposable Auth origin and use
// the existing exact allowlisted callback. Never serialize the returned URL.
export function localActionLink(value,type){
 let link
 try{link=new URL(value)}catch{throw Error('D1_GLOBAL_AUTH_INVALID_LOCAL_LINK')}
 if(!['invite','recovery'].includes(type)||link.origin!==authEndpoint||link.pathname!=='/auth/v1/verify'||link.username||link.password||link.hash||link.searchParams.get('type')!==type||link.searchParams.get('redirect_to')!==authOrigin+'/auth/callback'||!link.searchParams.get('token'))throw Error('D1_GLOBAL_AUTH_INVALID_LOCAL_LINK')
 return link.href
}

export function authAppEnvironment(source,anon){
 const env=Object.fromEntries(['PATH','HOME','TMPDIR','RUNNER_TEMP','CI'].filter(k=>source[k]).map(k=>[k,source[k]]))
 return Object.assign(env,{NODE_ENV:'development',APP_ENV:'test',PRODUCT_STAGING_INTEGRATION:'false',PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_V1_ENABLED:'true',PRODUCT_DOCUMENT_LIBRARY_ENABLED:'false',PRODUCT_DOCUMENT_CONTENT_ENABLED:'false',PRODUCT_DOCUMENT_MAINTENANCE_ENABLED:'false',PRODUCT_V1_ORIGIN:authOrigin,NEXT_PUBLIC_SUPABASE_URL:authEndpoint,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,NEXT_PUBLIC_ENABLE_DEMO_DATA:'false',NEXT_PUBLIC_FORCE_OFFLINE_DEV:'false',NEXT_TELEMETRY_DISABLED:'1',AI_PRODUCT_V2_ENABLED:'false',OPENAI_API_KEY:''})
}
