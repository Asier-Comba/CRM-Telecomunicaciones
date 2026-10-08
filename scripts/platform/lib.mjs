import {readFileSync, readdirSync, existsSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
export const root=resolve(import.meta.dirname,'../..')
export const readJson=p=>JSON.parse(readFileSync(join(root,p),'utf8'))
export const hash=b=>createHash('sha256').update(b).digest('hex')
export function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)])}
export function migrations(){return readdirSync(join(root,'supabase/migrations')).filter(n=>/^\d{14}_[a-z0-9_]+\.sql$/.test(n)).sort().map(name=>({name,version:name.slice(0,14),sha256:hash(readFileSync(join(root,'supabase/migrations',name),'utf8').replaceAll('\r\n','\n'))}))}
export function run(bin,args,options={}){
 const r=spawnSync(bin,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024,...options})
 if(r.status!==0)throw new Error('PLATFORM_COMMAND_FAILED')
 return r.stdout
}
export function disposableGuard(env=process.env){
 if(env.PLATFORM_TARGET!=='LOCAL'||env.NODE_ENV==='production'||!(env.CI==='true'&&env.GITHUB_ACTIONS==='true'||env.W5_DISPOSABLE_LOCAL==='true'))throw new Error('DISPOSABLE_CI_LOCAL_ONLY')
 if(env.SUPABASE_ACCESS_TOKEN||env.SUPABASE_DB_PASSWORD||existsSync(join(root,'supabase/.temp/project-ref')))throw new Error('HOSTED_TARGET_FORBIDDEN')
}
export function loopback(value){try{const u=new URL(value);return u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)&&!u.username&&!u.password}catch{return false}}
export const safeError=e=>/^[A-Z][A-Z0-9_]{0,100}$/.test(e.message)?e.message:'PLATFORM_FAILURE'
