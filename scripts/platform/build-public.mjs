import {readJson,loopback} from './lib.mjs'
import {validValue} from './config.mjs'
export function validatePublicBuild(env){
 const manifest=readJson('infra/platform/environment-manifest.json'),errors=[]
 for(const name of Object.keys(env).filter(n=>n.startsWith('NEXT_PUBLIC_')&&env[n])){
  const entry=manifest.entries.find(e=>e.name===name)
  if(!manifest.public_allowlist.includes(name)||!entry||entry.secret)errors.push('UNREGISTERED_PUBLIC_BINDING')
  else if(!validValue(entry.type,env[name],loopback(env[name])?'LOCAL':'STAGING'))errors.push(`INVALID_${name}`)
 }
 const url=env.NEXT_PUBLIC_SUPABASE_URL,key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!!url!==!!key)errors.push('PUBLIC_PLATFORM_BINDINGS_INCOMPLETE')
 return {status:errors.length?'BLOCKED':'PASS',errors:[...new Set(errors)],values_included:false,unconfigured:!url&&!key}
}
if(process.argv[1]?.endsWith('build-public.mjs')){const r=validatePublicBuild(process.env);console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=1}
