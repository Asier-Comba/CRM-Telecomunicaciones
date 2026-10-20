import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import test from 'node:test'
import {loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-v1.mjs'
import {loadOwnedConsumerProfile87V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-87-v1.mjs'

const root=new URL('../../',import.meta.url)
const base=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-v1.json',root),'utf8'))
const profile=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-87-v1.json',root),'utf8'))
const fixture=JSON.parse(readFileSync(new URL('tests/fixtures/native-provider-rpc-grants-delivered.json',root),'utf8'))
const forward=profile.forward[0]
const rejected=/OWNED_CONSUMER_MIGRATION_PROFILE_87_REJECTED/
function files(t,{extension=true,forwardFile=true}={}){
  const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'telecom-migration-profile87-')),migrationDir=join(dir,'supabase','migrations')
  mkdirSync(migrationDir,{recursive:true})
  t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'telecom-migration-profile87-')));rmSync(dir,{recursive:true})})
  for(const row of base.canonical)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+row.name,root)),join(migrationDir,row.name))
  if(extension)writeFileSync(join(migrationDir,base.owner_extension.name),fixture.sql)
  if(forwardFile)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+forward.name,root)),join(migrationDir,forward.name))
  return {root:pathToFileURL(dir+'/'),migrationDir}
}

test('actual checkout is exactly profile87 while the strict 85/86 closures keep rejecting it',()=>{
  const p=loadOwnedConsumerProfile87V1(root)
  assert.equal(p.count,87);assert.equal(p.closure,'profile_87')
  assert.deepEqual(p.migrations.map(m=>m.name),[...p.migrations.map(m=>m.name)].sort())
  assert.equal(p.migrations.at(-1).name,forward.name)
  assert.equal(p.migrations.filter(m=>m.name===base.owner_extension.name).length,1)
  assert.equal(p.ownerExtensionSha256,base.owner_extension.sha256);assert.deepEqual(p.forwardSha256,[forward.sha256])
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.migrations)&&p.migrations.every(Object.isFrozen))
  assert.throws(()=>loadOwnedConsumerMigrationsV1(root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  assert.throws(()=>loadOwnedConsumerGrants86V1(root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  assert.throws(()=>loadOwnedConsumerMigrationsV1(root,'delivered_grants_86'),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})

test('profile87 applies the same 86 SQL as the owner-directory86 closure plus only the pinned forward migration',t=>{
  const p87=files(t),p86=files(t,{forwardFile:false})
  const a=loadOwnedConsumerProfile87V1(p87.root),b=loadOwnedConsumerMigrationsV1(p86.root)
  assert.equal(b.closure,'owner_directory_86')
  assert.deepEqual(a.migrations.filter(m=>m.name!==forward.name),b.migrations)
  assert.equal(a.migrations.find(m=>m.name===forward.name).sql,readFileSync(fileURLToPath(new URL('supabase/migrations/'+forward.name,root)),'utf8').replaceAll('\r\n','\n'))
})

test('profile87 rejects a missing extension or forward file instead of delivering or waiving them',t=>{
  assert.throws(()=>loadOwnedConsumerProfile87V1(files(t,{extension:false}).root),rejected)
  assert.throws(()=>loadOwnedConsumerProfile87V1(files(t,{forwardFile:false}).root),rejected)
  const c=files(t);rmSync(join(c.migrationDir,base.canonical[0].name))
  assert.throws(()=>loadOwnedConsumerProfile87V1(c.root),rejected)
})

test('profile87 rejects modified bytes in forward, extension or canonical SQL',t=>{
  const a=files(t);writeFileSync(join(a.migrationDir,forward.name),readFileSync(join(a.migrationDir,forward.name),'utf8')+'\n-- changed\n')
  assert.throws(()=>loadOwnedConsumerProfile87V1(a.root),rejected)
  const b=files(t);writeFileSync(join(b.migrationDir,base.owner_extension.name),fixture.sql+'-- modified\n')
  assert.throws(()=>loadOwnedConsumerProfile87V1(b.root),rejected)
  const c=files(t),first=base.canonical[0].name;writeFileSync(join(c.migrationDir,first),readFileSync(join(c.migrationDir,first),'utf8')+'\n-- changed\n')
  assert.throws(()=>loadOwnedConsumerProfile87V1(c.root),rejected)
})

test('profile87 rejects unknown extras, including a later Storage migration not yet composed',t=>{
  const a=files(t);writeFileSync(join(a.migrationDir,'20261020090000_document_object_read_server_fetch.sql'),'select 1;')
  assert.throws(()=>loadOwnedConsumerProfile87V1(a.root),rejected)
  const b=files(t);writeFileSync(join(b.migrationDir,'20261021000000_unowned.sql'),'select 1;')
  assert.throws(()=>loadOwnedConsumerProfile87V1(b.root),rejected)
  const c=files(t);writeFileSync(join(c.migrationDir,'20261020100000_business_conflict_non_retryable.sql.sql'),'select 1;')
  assert.throws(()=>loadOwnedConsumerProfile87V1(c.root),rejected)
})

test('CRLF checkout maps to the identical pinned LF SQL, any other byte change is rejected',t=>{
  const a=files(t),b=files(t)
  for(const name of [forward.name,base.canonical[0].name]){
    const sql=readFileSync(join(a.migrationDir,name),'utf8').replaceAll('\r\n','\n')
    writeFileSync(join(a.migrationDir,name),sql);writeFileSync(join(b.migrationDir,name),sql.replaceAll('\n','\r\n'))
  }
  assert.deepEqual(loadOwnedConsumerProfile87V1(a.root).migrations,loadOwnedConsumerProfile87V1(b.root).migrations)
  writeFileSync(join(b.migrationDir,forward.name),readFileSync(join(b.migrationDir,forward.name),'utf8')+'-- changed\r\n')
  assert.throws(()=>loadOwnedConsumerProfile87V1(b.root),rejected)
})

test('profile87 rejects non-file roots',()=>{
  assert.throws(()=>loadOwnedConsumerProfile87V1('.'),rejected)
  assert.throws(()=>loadOwnedConsumerProfile87V1(new URL('https://example.invalid/')),rejected)
})
