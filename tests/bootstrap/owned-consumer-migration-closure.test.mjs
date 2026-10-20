import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import test from 'node:test'
import {loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-v1.mjs'

const root=new URL('../../',import.meta.url)
const manifest=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-v1.json',root),'utf8'))
const fixture=JSON.parse(readFileSync(new URL('tests/fixtures/native-provider-rpc-grants-delivered.json',root),'utf8'))
function files(t){
  const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'telecom-migration-closure-')),migrationDir=join(dir,'supabase','migrations')
  mkdirSync(migrationDir,{recursive:true})
  t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'telecom-migration-closure-')));rmSync(dir,{recursive:true})})
  for(const row of manifest.canonical)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+row.name,root)),join(migrationDir,row.name))
  return {root:pathToFileURL(dir+'/'),migrationDir}
}
test('canonical85 exact bytes and explicit delivered86 preserve frozen SQL and declared counts',t=>{
  const f=files(t)
  const canonical=loadOwnedConsumerMigrationsV1(f.root),union=loadOwnedConsumerMigrationsV1(f.root,'delivered_grants_86')
  assert.equal(canonical.count,85);assert.equal(canonical.closure,'canonical_85');assert.equal(canonical.ownerExtensionSha256,null)
  assert.equal(union.count,86);assert.equal(union.closure,'delivered_grants_86')
  assert.equal(union.ownerExtensionSha256,'700d2dea9db5351cb97a0256461e67e93d399d9c0b8320bbd2e8b96ed4f6da9b')
  assert.equal(union.migrations.find(row=>row.name===manifest.owner_extension.name).sql,fixture.sql)
  assert.deepEqual(union.migrations.filter(row=>row.name!==manifest.owner_extension.name),canonical.migrations)
  assert.ok(Object.isFrozen(union)&&Object.isFrozen(union.migrations)&&union.migrations.every(Object.isFrozen))
})
test('grants86 caller rejects the 87 checkout and admits both exact directory profiles without duplicate application',t=>{
  // The checkout now also carries the W5 forward migration: the strict 86 caller must
  // reject it. Profile87 admits it explicitly (owned-consumer-migration-profile87.test.mjs).
  assert.throws(()=>loadOwnedConsumerGrants86V1(root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  const canonical=files(t),owner=files(t)
  writeFileSync(join(owner.migrationDir,manifest.owner_extension.name),fixture.sql)
  const delivered=loadOwnedConsumerGrants86V1(canonical.root),directory=loadOwnedConsumerGrants86V1(owner.root)
  assert.deepEqual(delivered.migrations,directory.migrations)
  assert.equal(delivered.count,86);assert.equal(directory.count,86)
  assert.equal(directory.migrations.filter(row=>row.name===manifest.owner_extension.name).length,1)
  assert.equal(directory.ownerExtensionSha256,fixture.sha256)
  assert.throws(()=>loadOwnedConsumerMigrationsV1(owner.root,'delivered_grants_86'),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  writeFileSync(join(owner.migrationDir,manifest.owner_extension.name),fixture.sql+'-- modified\n')
  assert.throws(()=>loadOwnedConsumerGrants86V1(owner.root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})
test('owner directory86 is admitted only with exact source-pinned extension, never applied twice',t=>{
  const f=files(t);writeFileSync(join(f.migrationDir,manifest.owner_extension.name),fixture.sql)
  const union=loadOwnedConsumerMigrationsV1(f.root)
  assert.equal(union.count,86);assert.equal(union.closure,'owner_directory_86')
  assert.throws(()=>loadOwnedConsumerMigrationsV1(f.root,'delivered_grants_86'),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})
test('fresh LF checkout and CRLF checkout map to identical pinned Git SQL while other changes remain rejected',t=>{
  const a=files(t),b=files(t)
  for(const row of manifest.canonical){
    const sql=readFileSync(join(a.migrationDir,row.name),'utf8').replaceAll('\r\n','\n')
    writeFileSync(join(a.migrationDir,row.name),sql)
    writeFileSync(join(b.migrationDir,row.name),sql.replaceAll('\n','\r\n'))
  }
  assert.deepEqual(loadOwnedConsumerMigrationsV1(a.root).migrations,loadOwnedConsumerMigrationsV1(b.root).migrations)
  const first=manifest.canonical[0].name
  writeFileSync(join(b.migrationDir,first),readFileSync(join(b.migrationDir,first),'utf8')+'-- changed\r\n')
  assert.throws(()=>loadOwnedConsumerMigrationsV1(b.root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})
test('same migration count with modified canonical SQL or substituted extra SQL fails before caller application',t=>{
  const a=files(t),first=manifest.canonical[0].name
  writeFileSync(join(a.migrationDir,first),readFileSync(join(a.migrationDir,first),'utf8')+'\n-- changed\n')
  assert.throws(()=>loadOwnedConsumerMigrationsV1(a.root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  const b=files(t);writeFileSync(join(b.migrationDir,manifest.owner_extension.name),'-- wrong grants\n')
  assert.throws(()=>loadOwnedConsumerMigrationsV1(b.root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})
test('unknown extra missing SQL and unrecognized caller mode cannot relax the closure',t=>{
  const a=files(t);writeFileSync(join(a.migrationDir,'20261013000000_unowned.sql'),'select 1;')
  assert.throws(()=>loadOwnedConsumerMigrationsV1(a.root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  const b=files(t);rmSync(join(b.migrationDir,manifest.canonical[0].name))
  assert.throws(()=>loadOwnedConsumerMigrationsV1(b.root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
  assert.throws(()=>loadOwnedConsumerMigrationsV1(root,'arbitrary_86'),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
})
