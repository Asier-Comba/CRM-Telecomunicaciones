import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import test from 'node:test'
import {loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-v1.mjs'
import {loadOwnedConsumerProfile87V1,loadOwnedConsumerHistorical86V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-87-v1.mjs'
import {loadOwnedConsumerProfile88V1,historicalScopeFromProfile88V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-88-v1.mjs'

const root=new URL('../../',import.meta.url)
const base=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-v1.json',root),'utf8'))
const p87=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-87-v1.json',root),'utf8'))
const p88=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-88-v1.json',root),'utf8'))
const fixture=JSON.parse(readFileSync(new URL('tests/fixtures/native-provider-rpc-grants-delivered.json',root),'utf8'))
const f87=p87.forward[0],f88=p88.forward[0]
const rejected=/OWNED_CONSUMER_MIGRATION_PROFILE_88_REJECTED/
function files(t,{forward87=true,forward88=true}={}){
  const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'telecom-migration-profile88-')),migrationDir=join(dir,'supabase','migrations')
  mkdirSync(migrationDir,{recursive:true})
  t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'telecom-migration-profile88-')));rmSync(dir,{recursive:true})})
  for(const row of base.canonical)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+row.name,root)),join(migrationDir,row.name))
  writeFileSync(join(migrationDir,base.owner_extension.name),fixture.sql)
  if(forward87)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+f87.name,root)),join(migrationDir,f87.name))
  if(forward88)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+f88.name,root)),join(migrationDir,f88.name))
  return {root:pathToFileURL(dir+'/'),migrationDir}
}

test('actual checkout is exactly profile88 while 85/86 and 87 loaders keep rejecting it',()=>{
  const p=loadOwnedConsumerProfile88V1(root)
  assert.equal(p.count,88);assert.equal(p.closure,'profile_88')
  assert.deepEqual(p.migrations.map(m=>m.name),[...p.migrations.map(m=>m.name)].sort())
  assert.deepEqual(p.migrations.slice(-2).map(m=>m.name),[f87.name,f88.name])
  assert.deepEqual(p.forwardSha256,[f87.sha256,f88.sha256])
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.migrations)&&p.migrations.every(Object.isFrozen))
  assert.throws(()=>loadOwnedConsumerProfile87V1(root),/OWNED_CONSUMER_MIGRATION_PROFILE_87_REJECTED/)
  assert.throws(()=>loadOwnedConsumerMigrationsV1(root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  assert.throws(()=>loadOwnedConsumerGrants86V1(root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  assert.throws(()=>loadOwnedConsumerHistorical86V1(root,loadOwnedConsumerGrants86V1),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})

test('profile88 = exact profile87 SQL plus only the pinned Storage forward migration',t=>{
  const a=loadOwnedConsumerProfile88V1(files(t).root),b=loadOwnedConsumerProfile87V1(files(t,{forward88:false}).root)
  assert.deepEqual(a.migrations.filter(m=>m.name!==f88.name),b.migrations)
  assert.equal(p88.forward[0].sha256,'64bc484e1e80db1766e5265e1f96e4040d995086c3067682791146cbe5ab6fcc')
  assert.equal(p88.forward[0].hosted_version,null);assert.match(p88.hosted_ledger_verified,/^NOT_APPLIED/)
})

test('historical 87 and 86 scopes on profile88 apply exactly their own pinned SQL',t=>{
  const h87=historicalScopeFromProfile88V1(root,87),h86=historicalScopeFromProfile88V1(root,86)
  assert.equal(h87.count,87);assert.equal(h87.closure,'historical_87_from_profile_88');assert.deepEqual(h87.excludedForward,[f88.name])
  assert.equal(h86.count,86);assert.equal(h86.closure,'historical_86_from_profile_88');assert.deepEqual(h86.excludedForward,[f87.name,f88.name])
  assert.deepEqual(h87.migrations,loadOwnedConsumerProfile87V1(files(t,{forward88:false}).root).migrations)
  assert.deepEqual(h86.migrations,loadOwnedConsumerMigrationsV1(files(t,{forward87:false,forward88:false}).root).migrations)
})

test('historical scopes return null for a non-88 directory so callers keep their strict loader',t=>{
  assert.equal(historicalScopeFromProfile88V1(files(t,{forward88:false}).root,87),null)
  assert.equal(historicalScopeFromProfile88V1(files(t,{forward87:false,forward88:false}).root,86),null)
  assert.throws(()=>historicalScopeFromProfile88V1(root,85),rejected)
})

test('profile88 rejects missing, modified, extra or reordered-version SQL',t=>{
  assert.throws(()=>loadOwnedConsumerProfile88V1(files(t,{forward87:false}).root),rejected)
  assert.throws(()=>loadOwnedConsumerProfile88V1(files(t,{forward88:false}).root),rejected)
  const a=files(t);writeFileSync(join(a.migrationDir,f88.name),readFileSync(join(a.migrationDir,f88.name),'utf8')+'\n-- changed\n')
  assert.throws(()=>loadOwnedConsumerProfile88V1(a.root),rejected);assert.equal(historicalScopeFromProfile88V1(a.root,87),null)
  const b=files(t);writeFileSync(join(b.migrationDir,'20261022000000_unowned.sql'),'select 1;')
  assert.throws(()=>loadOwnedConsumerProfile88V1(b.root),rejected)
  const c=files(t);rmSync(join(c.migrationDir,f88.name));writeFileSync(join(c.migrationDir,'20261020090000_document_object_read_server_fetch.sql'),readFileSync(fileURLToPath(new URL('supabase/migrations/'+f88.name,root))))
  assert.throws(()=>loadOwnedConsumerProfile88V1(c.root),rejected)
  const d=files(t),first=base.canonical[0].name;writeFileSync(join(d.migrationDir,first),readFileSync(join(d.migrationDir,first),'utf8')+'\n-- changed\n')
  assert.throws(()=>loadOwnedConsumerProfile88V1(d.root),rejected)
})

test('CRLF checkout maps to the identical pinned LF SQL; non-file roots are rejected',t=>{
  const a=files(t),b=files(t),sql=readFileSync(join(a.migrationDir,f88.name),'utf8').replaceAll('\r\n','\n')
  writeFileSync(join(a.migrationDir,f88.name),sql);writeFileSync(join(b.migrationDir,f88.name),sql.replaceAll('\n','\r\n'))
  assert.deepEqual(loadOwnedConsumerProfile88V1(a.root).migrations,loadOwnedConsumerProfile88V1(b.root).migrations)
  assert.throws(()=>loadOwnedConsumerProfile88V1('.'),rejected)
  assert.throws(()=>loadOwnedConsumerProfile88V1(new URL('https://example.invalid/')),rejected)
})
