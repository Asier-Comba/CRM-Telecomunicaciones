import {createHash} from 'node:crypto'
import {lstatSync,readFileSync,readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'

// Explicit 87 profile: the exact 86 owner-directory closure (canonical85 + grants86
// extension, pinned by assistant.owned-consumer-migrations.v1) plus the W5 forward
// migrations pinned here with hosted provenance. The 85/86 loader and manifest are
// untouched and keep rejecting any 87 checkout; callers must opt in to this profile.
const base=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-v1.json',import.meta.url),'utf8'))
const profile=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-87-v1.json',import.meta.url),'utf8'))
const fail=()=>Error('OWNED_CONSUMER_MIGRATION_PROFILE_87_REJECTED')
const hash=wire=>createHash('sha256').update(wire).digest('hex')
const decode=wire=>new TextDecoder('utf-8',{fatal:true}).decode(wire)

/** Exactly 87 named, byte-pinned migrations in lexicographic order, read and
 * validated in full before the caller applies the first one. No delivered
 * fixture, no unknown extra, no missing file, no count waiver. */
export function loadOwnedConsumerProfile87V1(root){
  try{
    if(!(root instanceof URL)||root.protocol!=='file:')throw fail()
    if(base.contract!=='assistant.owned-consumer-migrations.v1'||base.canonical_count!==85||base.canonical.length!==85)throw fail()
    if(profile.contract!=='w5.owned-consumer-migrations-87.v1'||profile.base_contract!==base.contract||profile.base_count!==86
      ||profile.count!==87||!Array.isArray(profile.forward)||profile.forward.length!==1)throw fail()
    const pinned=[...base.canonical,base.owner_extension,...profile.forward]
    const pins=new Map(pinned.map(row=>[row.name,row.sha256]))
    if(pins.size!==87||[...pins.values()].some(sha=>!/^[0-9a-f]{64}$/.test(sha)))throw fail()
    const directory=fileURLToPath(new URL('supabase/migrations/',root))
    const names=readdirSync(directory).filter(name=>name.endsWith('.sql')).sort()
    if(JSON.stringify(names)!==JSON.stringify([...pins.keys()].sort()))throw fail()
    const entries=names.map(name=>{
      const path=join(directory,name),stat=lstatSync(path)
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw fail()
      const wire=readFileSync(path),raw=decode(wire)
      // Same rule as the 85/86 loader: a Windows CRLF checkout is admitted only
      // when it maps back to the exact pinned LF bytes, which are then applied.
      const sql=hash(wire)===pins.get(name)?raw:raw.replaceAll('\r\n','\n')
      if(hash(Buffer.from(sql,'utf8'))!==pins.get(name))throw fail()
      return Object.freeze({name,sql})
    })
    return Object.freeze({contract:profile.contract,closure:'profile_87',migrations:Object.freeze(entries),count:entries.length,
      ownerExtensionSha256:base.owner_extension.sha256,forwardSha256:Object.freeze(profile.forward.map(row=>row.sha256))})
  }catch{throw fail()}
}
