import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validatePublicBuild} from '../../scripts/platform/build-public.mjs'
test('public build rejects private credentials before artifact generation and never echoes values',()=>{
 const url='https://project.supabase.co',secret='sb_secret_private-canary'
 assert.equal(validatePublicBuild({}).status,'PASS')
 assert.equal(validatePublicBuild({NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'}).status,'PASS')
 for(const env of [{NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:secret},{NEXT_PUBLIC_ARBITRARY_SECRET:secret},{NEXT_PUBLIC_SUPABASE_URL:url}]){
  const r=validatePublicBuild(env);assert.equal(r.status,'BLOCKED');assert.equal(JSON.stringify(r).includes(secret),false)
 }
 const jwt=role=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.synthetic'
 assert.equal(validatePublicBuild({NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('service_role')}).status,'BLOCKED')
 assert.equal(validatePublicBuild({NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon')}).status,'PASS')
})
