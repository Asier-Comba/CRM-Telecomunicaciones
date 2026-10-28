import {createHash} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {validatePublicBuild} from './build-public.mjs'
import {root} from './lib.mjs'

// Fixed tuple of the three public values frozen into this environment's browser build.
// Never serialize process.env, server credentials or the public values themselves.
const tuple=env=>[env.NEXT_PUBLIC_APP_URL||'',env.NEXT_PUBLIC_SUPABASE_URL||'',env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'']
export const publicBuildSha256=env=>createHash('sha256').update(JSON.stringify([
 ['NEXT_PUBLIC_APP_URL',env.NEXT_PUBLIC_APP_URL||''],
 ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''],
 ['NEXT_PUBLIC_SUPABASE_URL',env.NEXT_PUBLIC_SUPABASE_URL||'']
])).digest('hex')
export function createPublicBuildBinding(env){
 const values=tuple(env),configured=values.every(Boolean)
 if(validatePublicBuild(env).status!=='PASS'||values.some(Boolean)&&!configured)throw Error('PUBLIC_BUILD_BINDINGS_INVALID_OR_INCOMPLETE')
 return {version:1,configured,public_sha256:publicBuildSha256(env)}
}
export function publicBuildMatches(env,binding){
 return Boolean(binding&&typeof binding==='object'&&!Array.isArray(binding)&&
  Object.keys(binding).length===3&&['version','configured','public_sha256'].every(k=>Object.hasOwn(binding,k))&&
  binding.version===1&&binding.configured===true&&tuple(env).every(Boolean)&&
  typeof binding.public_sha256==='string'&&/^[0-9a-f]{64}$/.test(binding.public_sha256)&&binding.public_sha256===publicBuildSha256(env))
}
if(process.argv[1]?.endsWith('build-binding.mjs')){
 const binding=createPublicBuildBinding(process.env)
 writeFileSync(join(root,'.next/public-build-binding.json'),JSON.stringify(binding)+'\n',{mode:0o644})
 console.log(JSON.stringify({status:'PASS',configured:binding.configured,values_included:false}))
}
