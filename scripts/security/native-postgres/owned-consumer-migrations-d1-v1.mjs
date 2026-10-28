import {createHash} from 'node:crypto'
import {lstatSync,readFileSync,readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'

const base=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-v1.json',import.meta.url),'utf8'))
const historical=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-87-v1.json',import.meta.url),'utf8'))
const profile=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-d1-v1.json',import.meta.url),'utf8'))
const hash=wire=>createHash('sha256').update(wire).digest('hex')
const blob=wire=>createHash('sha1').update(Buffer.from(`blob ${wire.length}\0`)).update(wire).digest('hex')
const fail=()=>Error('OWNED_CONSUMER_MIGRATION_PROFILE_D1_REJECTED')

/** Explicit BASE87_PLUS_D1 only. Validate the complete directory before any
 * migration is exposed to a caller. The strict historical loaders are intact.
 * This profile has no Storage88, hosted-ledger or security-acceptance claim. */
export function loadOwnedConsumerD1V1(root){
 try{
  if(!(root instanceof URL)||root.protocol!=='file:')throw fail()
  if(base.contract!=='assistant.owned-consumer-migrations.v1'||base.canonical_count!==85||base.canonical.length!==85
   ||historical.contract!=='w5.owned-consumer-migrations-87.v1'||historical.count!==87||historical.forward.length!==1
   ||profile.contract!=='documents.owned-consumer-base87-plus-d1.v1'||profile.base_contract!==historical.contract||profile.count!==88
   ||profile.forward?.name!=='20261027154155_documents_library_v2.sql'||profile.storage_88_adopted!==false)throw fail()
  for(const [name,sha]of Object.entries(profile.base_manifests_sha256)){
   if(!['owned-consumer-migrations-v1.json','owned-consumer-migrations-87-v1.json'].includes(name)
    ||hash(readFileSync(new URL('./'+name,import.meta.url),'utf8').replaceAll('\r\n','\n'))!==sha)throw fail()
  }
  if(Object.keys(profile.base_manifests_sha256).length!==2)throw fail()
  const pins=[...base.canonical,base.owner_extension,...historical.forward,profile.forward]
  const byName=new Map(pins.map(row=>[row.name,row]))
  if(byName.size!==88||pins.some(row=>!/^[0-9a-f]{64}$/.test(row.sha256)))throw fail()
  const directory=fileURLToPath(new URL('supabase/migrations/',root))
  const names=readdirSync(directory).filter(name=>name.endsWith('.sql')).sort()
  if(JSON.stringify(names)!==JSON.stringify([...byName.keys()].sort()))throw fail()
  const entries=names.map(name=>{
   const path=join(directory,name),stat=lstatSync(path)
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw fail()
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(path))
   const sql=raw.replaceAll('\r\n','\n'),wire=Buffer.from(sql,'utf8'),pin=byName.get(name)
   if(hash(wire)!==pin.sha256||(pin.git_blob&&blob(wire)!==pin.git_blob))throw fail()
   return Object.freeze({name,sql})
  })
  return Object.freeze({contract:profile.contract,closure:'base87_plus_d1',count:88,migrations:Object.freeze(entries),
   ownerExtensionSha256:base.owner_extension.sha256,forwardSha256:Object.freeze([...historical.forward,profile.forward].map(row=>row.sha256)),
   source:profile.forward.owner_source,storage88:false})
 }catch{throw fail()}
}

/** No best-effort fallback: first validate all 88 pinned files, then project
 * only the exact historical86 or87 SQL. Unknown/modified SQL is never ignored. */
export function loadOwnedConsumerHistoricalD1V1(root,scope){
 try{
  if(![86,87].includes(scope))throw fail()
  const complete=loadOwnedConsumerD1V1(root)
  const pins=new Map([...base.canonical,base.owner_extension,...(scope===87?historical.forward:[])].map(row=>[row.name,row.sha256]))
  const entries=complete.migrations.filter(row=>pins.has(row.name))
  if(entries.length!==scope||entries.some(row=>hash(Buffer.from(row.sql,'utf8'))!==pins.get(row.name)))throw fail()
  const excluded=complete.migrations.filter(row=>!pins.has(row.name)).map(row=>row.name)
  const expected=[...(scope===86?historical.forward.map(row=>row.name):[]),profile.forward.name].sort()
  if(JSON.stringify(excluded)!==JSON.stringify(expected))throw fail()
  return Object.freeze({contract:profile.contract,closure:`historical_${scope}_from_base87_plus_d1`,count:scope,
   migrations:Object.freeze(entries),ownerExtensionSha256:base.owner_extension.sha256,excludedForward:Object.freeze(excluded),validatedCompleteCount:88})
 }catch{throw fail()}
}
