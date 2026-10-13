import {createHash} from 'node:crypto'
import {lstatSync,readFileSync,readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join} from 'node:path'

const manifest=JSON.parse(readFileSync(new URL('./owned-consumer-migrations-v1.json',import.meta.url),'utf8'))
const delivered=JSON.parse(readFileSync(new URL('../../../tests/fixtures/native-provider-rpc-grants-delivered.json',import.meta.url),'utf8'))
const fail=()=>Error('OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED')
const hash=wire=>createHash('sha256').update(wire).digest('hex')
const decode=wire=>new TextDecoder('utf-8',{fatal:true}).decode(wire)

/** Only the fixed canonical85 Git blobs and the exact delivered grant86 blob.
 * Validate and capture ALL SQL before applying the first migration. No count
 * waiver, owner-file edit, SQL replacement, grant removal or W4 approval. */
export function loadOwnedConsumerMigrationsV1(root,mode='directory'){
  try{
    if(!(root instanceof URL)||root.protocol!=='file:'||!['directory','delivered_grants_86'].includes(mode))throw fail()
    if(manifest.contract!=='assistant.owned-consumer-migrations.v1'||manifest.canonical_count!==85||manifest.canonical.length!==85)throw fail()
    const directory=fileURLToPath(new URL('supabase/migrations/',root)),extension=manifest.owner_extension
    const names=readdirSync(directory).filter(name=>name.endsWith('.sql')).sort()
    const expected=manifest.canonical.map(row=>row.name).sort(),hasExtension=names.includes(extension.name)
    const permitted=hasExtension?[...expected,extension.name].sort():expected
    if(JSON.stringify(names)!==JSON.stringify(permitted))throw fail()
    if(hasExtension&&mode!=='directory')throw fail()
    const pins=new Map([...manifest.canonical,extension].map(row=>[row.name,row.sha256]))
    const entries=names.map(name=>{
      const path=join(directory,name),stat=lstatSync(path)
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw fail()
      const wire=readFileSync(path),raw=decode(wire)
      // Git checkout may add CRLF on Windows. Admit only bytes that map back
      // exactly to the pinned Git object, then APPLY those pinned bytes (LF).
      // No trimming, whitespace rewriting or arbitrary content normalization.
      const sql=hash(wire)===pins.get(name)?raw:raw.replaceAll('\r\n','\n')
      if(hash(Buffer.from(sql,'utf8'))!==pins.get(name))throw fail()
      return Object.freeze({name,sql})
    })
    if(mode==='delivered_grants_86'){
      if(delivered.contract!=='assistant.delivered-native-grants-fixture.v1'||delivered.owner_source!==extension.owner_source
        ||delivered.sha256!==extension.sha256||typeof delivered.sql!=='string'||hash(Buffer.from(delivered.sql,'utf8'))!==extension.sha256)throw fail()
      entries.push(Object.freeze({name:extension.name,sql:delivered.sql}));entries.sort((a,b)=>a.name.localeCompare(b.name))
    }
    return Object.freeze({contract:manifest.contract,closure:mode==='delivered_grants_86'?'delivered_grants_86':hasExtension?'owner_directory_86':'canonical_85',
      migrations:Object.freeze(entries),count:entries.length,ownerExtensionSha256:entries.length===86?extension.sha256:null})
  }catch{throw fail()}
}
