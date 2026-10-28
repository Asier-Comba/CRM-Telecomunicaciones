import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import test from 'node:test'
import {loadOwnedConsumerD1V1,loadOwnedConsumerHistoricalD1V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-d1-v1.mjs'
import {loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-v1.mjs'
import {loadOwnedConsumerProfile87V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-87-v1.mjs'
import {selectOwnedConsumerMigrationsV1} from '../../scripts/security/native-postgres/owned-consumer-migration-selection-v1.mjs'
const root=new URL('../../',import.meta.url)
const base=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-v1.json',root),'utf8'))
const p87=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-87-v1.json',root),'utf8'))
const profile=JSON.parse(readFileSync(new URL('scripts/security/native-postgres/owned-consumer-migrations-d1-v1.json',root),'utf8'))
const pins=[...base.canonical,base.owner_extension,...p87.forward,profile.forward]
const rejected=/OWNED_CONSUMER_MIGRATION_PROFILE_D1_REJECTED/
function files(t,count=88){
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'telecom-migration-d1-')),migrationDir=join(dir,'supabase','migrations')
 mkdirSync(migrationDir,{recursive:true})
 t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'telecom-migration-d1-')));rmSync(dir,{recursive:true})})
 const selected=count===85?base.canonical:count===86?[...base.canonical,base.owner_extension]:count===87?pins.slice(0,-1):pins
 for(const row of selected)copyFileSync(fileURLToPath(new URL('supabase/migrations/'+row.name,root)),join(migrationDir,row.name))
 return {root:pathToFileURL(dir+'/'),migrationDir}
}
test('actual D1 closure is byte/blob/source pinned and strict85/86/87 keep rejecting it',()=>{
 const result=loadOwnedConsumerD1V1(root)
 assert.equal(result.count,88);assert.equal(result.closure,'base87_plus_d1');assert.equal(result.storage88,false)
 assert.equal(result.source,'8cc9adf6050a0cc2ba12cbbe8b1ee0475102ac32')
 assert.equal(result.migrations.at(-1).name,profile.forward.name)
 assert.deepEqual(result.migrations.map(r=>r.name),pins.map(r=>r.name).sort())
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.migrations)&&result.migrations.every(Object.isFrozen))
 for(const load of [loadOwnedConsumerMigrationsV1,loadOwnedConsumerGrants86V1])assert.throws(()=>load(root),/OWNED_CONSUMER_MIGRATION_CLOSURE_REJECTED/)
 assert.throws(()=>loadOwnedConsumerProfile87V1(root),/OWNED_CONSUMER_MIGRATION_PROFILE_87_REJECTED/)
})
test('D1 rejects exact85/86/87 rather than delivering or omitting files',t=>{
 for(const count of [85,86,87])assert.throws(()=>loadOwnedConsumerD1V1(files(t,count).root),rejected)
})
test('consumer selection is explicit and all historical modes preserve their strict rejection of D1',()=>{
 for(const mode of [undefined,'','delivered_grants_86','require_grants_86','require_profile_87','historical_grants_86'])assert.throws(()=>selectOwnedConsumerMigrationsV1(root,mode),/REJECTED/)
 for(const [mode,count]of [['require_base87_plus_d1',88],['historical_grants_86_from_d1',86],['historical_profile_87_from_d1',87]])assert.equal(selectOwnedConsumerMigrationsV1(root,mode).count,count)
 for(const mode of ['any_88','profile_88','require_storage_88'])assert.throws(()=>selectOwnedConsumerMigrationsV1(root,mode),/OWNED_CONSUMER_MIGRATION_MODE_REJECTED/)
})
test('historical projections match unchanged exact86/87 loaders only after validating full D1',t=>{
 const h86=loadOwnedConsumerHistoricalD1V1(root,86),h87=loadOwnedConsumerHistoricalD1V1(root,87)
 assert.deepEqual(h86.migrations,loadOwnedConsumerGrants86V1(files(t,86).root).migrations)
 assert.deepEqual(h87.migrations,loadOwnedConsumerProfile87V1(files(t,87).root).migrations)
 assert.equal(h86.validatedCompleteCount,88);assert.equal(h87.validatedCompleteCount,88)
 assert.deepEqual(h86.excludedForward,[...p87.forward.map(r=>r.name),profile.forward.name].sort())
 assert.deepEqual(h87.excludedForward,[profile.forward.name]);assert.equal(h86.count,86);assert.equal(h87.count,87)
 assert.ok(Object.isFrozen(h86)&&Object.isFrozen(h86.excludedForward))
 for(const scope of [85,88,'87',null])assert.throws(()=>loadOwnedConsumerHistoricalD1V1(root,scope),rejected)
})
test('same-count Storage88 substitution is rejected by full and historical callers',t=>{
 const f=files(t);rmSync(join(f.migrationDir,profile.forward.name));writeFileSync(join(f.migrationDir,'20261020090000_document_object_read_server_fetch.sql'),'select 1;')
 for(const read of [r=>loadOwnedConsumerD1V1(r),r=>loadOwnedConsumerHistoricalD1V1(r,86),r=>loadOwnedConsumerHistoricalD1V1(r,87)])assert.throws(()=>read(f.root),rejected)
})
test('missing modified or unknown extra canonical/forward SQL cannot degrade to a historical subset',t=>{
 for(const name of [base.canonical[0].name,base.owner_extension.name,p87.forward[0].name,profile.forward.name]){
  const changed=files(t);writeFileSync(join(changed.migrationDir,name),readFileSync(join(changed.migrationDir,name),'utf8')+'-- modified\n')
  const missing=files(t);rmSync(join(missing.migrationDir,name))
  for(const f of [changed,missing])for(const scope of [86,87])assert.throws(()=>loadOwnedConsumerHistoricalD1V1(f.root,scope),rejected)
 }
 const extra=files(t);writeFileSync(join(extra.migrationDir,'20261028000000_unowned.sql'),'select 1;')
 assert.throws(()=>loadOwnedConsumerD1V1(extra.root),rejected)
})
test('only CRLF-to-pinned-LF mapping is admitted; whitespace and invalid roots remain rejected',t=>{
 const f=files(t)
 for(const pin of pins)writeFileSync(join(f.migrationDir,pin.name),readFileSync(join(f.migrationDir,pin.name),'utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'))
 assert.deepEqual(loadOwnedConsumerD1V1(f.root).migrations,loadOwnedConsumerD1V1(root).migrations)
 writeFileSync(join(f.migrationDir,profile.forward.name),readFileSync(join(f.migrationDir,profile.forward.name),'utf8')+' ')
 assert.throws(()=>loadOwnedConsumerD1V1(f.root),rejected)
 for(const input of ['.',new URL('https://example.invalid/')])assert.throws(()=>loadOwnedConsumerD1V1(input),rejected)
})
