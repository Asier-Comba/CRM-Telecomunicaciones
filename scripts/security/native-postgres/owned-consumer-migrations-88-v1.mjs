import {createHash} from 'node:crypto'
import {lstatSync,readFileSync,readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'

// Explicit 88 profile (Storage P0 proposal, NOT applied to staging): the exact
// profile87 set plus the single W5 Storage forward migration pinned here. The
// 85/86 and 87 loaders and manifests are untouched and keep rejecting an 88
// checkout; callers opt in to this profile or to one of its historical scopes.
const base=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-v1.json',import.meta.url),'utf8'))
const p87=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-87-v1.json',import.meta.url),'utf8'))
const profile=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-88-v1.json',import.meta.url),'utf8'))
const fail=()=>Error('OWNED_CONSUMER_MIGRATION_PROFILE_88_REJECTED')
const hash=wire=>createHash('sha256').update(wire).digest('hex')
const decode=wire=>new TextDecoder('utf-8',{fatal:true}).decode(wire)
const scopes={86:()=>[...base.canonical,base.owner_extension],87:()=>[...base.canonical,base.owner_extension,...p87.forward]}

/** Exactly 88 named, byte-pinned migrations in lexicographic order, read and
 * validated in full before the caller applies the first one. No delivered
 * fixture, no unknown extra, no missing file, no count waiver. */
export function loadOwnedConsumerProfile88V1(root){
  try{
    if(!(root instanceof URL)||root.protocol!=='file:')throw fail()
    if(base.contract!=='assistant.owned-consumer-migrations.v1'||base.canonical_count!==85||base.canonical.length!==85)throw fail()
    if(p87.contract!=='w5.owned-consumer-migrations-87.v1'||p87.count!==87||p87.forward.length!==1)throw fail()
    if(profile.contract!=='w5.owned-consumer-migrations-88.v1'||profile.base_contract!==p87.contract||profile.base_count!==87
      ||profile.count!==88||!Array.isArray(profile.forward)||profile.forward.length!==1)throw fail()
    const pins=new Map([...scopes[87](),...profile.forward].map(row=>[row.name,row.sha256]))
    if(pins.size!==88||[...pins.values()].some(sha=>!/^[0-9a-f]{64}$/.test(sha)))throw fail()
    const directory=fileURLToPath(new URL('supabase/migrations/',root))
    const names=readdirSync(directory).filter(name=>name.endsWith('.sql')).sort()
    if(JSON.stringify(names)!==JSON.stringify([...pins.keys()].sort()))throw fail()
    const entries=names.map(name=>{
      const path=join(directory,name),stat=lstatSync(path)
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw fail()
      const wire=readFileSync(path),raw=decode(wire)
      // Same rule as the 85/86/87 loaders: a Windows CRLF checkout is admitted
      // only when it maps back to the exact pinned LF bytes, which are applied.
      const sql=hash(wire)===pins.get(name)?raw:raw.replaceAll('\r\n','\n')
      if(hash(Buffer.from(sql,'utf8'))!==pins.get(name))throw fail()
      return Object.freeze({name,sql})
    })
    return Object.freeze({contract:profile.contract,closure:'profile_88',migrations:Object.freeze(entries),count:entries.length,
      ownerExtensionSha256:base.owner_extension.sha256,forwardSha256:Object.freeze([...p87.forward,...profile.forward].map(row=>row.sha256))})
  }catch{throw fail()}
}

/** Historical 86 or 87 scope on an exact profile88 checkout: the whole
 * directory is validated as profile88 first, then ONLY that scope's pinned
 * blobs (same hashes as their own manifests) are returned. Returns null when
 * the directory is not profile88 so the caller keeps its own strict loader. */
export function historicalScopeFromProfile88V1(root,scope){
  let p88
  try{p88=loadOwnedConsumerProfile88V1(root)}catch{return null}
  try{
    if(!(scope in scopes))throw fail()
    const pins=new Map(scopes[scope]().map(row=>[row.name,row.sha256]))
    const entries=p88.migrations.filter(m=>pins.has(m.name))
    if(entries.length!==scope||pins.size!==scope||entries.some(m=>hash(Buffer.from(m.sql,'utf8'))!==pins.get(m.name)))throw fail()
    return Object.freeze({contract:scope===86?base.contract:p87.contract,closure:'historical_'+scope+'_from_profile_88',migrations:Object.freeze(entries),count:scope,
      ownerExtensionSha256:base.owner_extension.sha256,excludedForward:Object.freeze(p88.migrations.filter(m=>!pins.has(m.name)).map(m=>m.name))})
  }catch{throw fail()}
}
