import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {globalDocumentsFixture} from '../../tools/asier_documents_global/fixture-sql.mjs'
function users(){const workspaces=[randomUUID(),randomUUID(),randomUUID()];return Object.fromEntries([['ownerA',0,'owner'],['adminA',0,'admin'],['memberA',0,'member'],['viewerA',0,'viewer'],['ownerB',1,'owner'],['emptyOwner',2,'owner']].map(([name,index,role])=>[name,{id:randomUUID(),workspace:workspaces[index],role}]))}
test('fixture rejects interpolated identities, incompatible roles and merged tenant boundaries',()=>{
 for(const mutate of [u=>u.ownerA.id="invalid'",u=>u.memberA.role='owner',u=>u.ownerB.workspace=u.ownerA.workspace,u=>u.viewerA.workspace=u.ownerB.workspace,u=>u.extra=u.ownerA]){const u=users();mutate(u);assert.throws(()=>globalDocumentsFixture(u),/D1_GLOBAL_INVALID_FIXTURE_USERS/)}
})
test('real global runner refuses ordinary execution before Docker, credentials or stack setup',t=>{
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'documents-global-guard-'))
 t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'documents-global-guard-')));rmSync(dir,{recursive:true})})
 const root=fileURLToPath(new URL('../../',import.meta.url)),result=spawnSync(process.execPath,['--experimental-transform-types','tools/asier_documents_global/run.mjs'],{cwd:root,env:{...process.env,CI:'false',GITHUB_ACTIONS:'false',DOCUMENTS_GLOBAL_AUTH:'false',RUNNER_TEMP:dir},encoding:'utf8',timeout:30000,windowsHide:true})
 assert.equal(result.status,1)
 const report=JSON.parse(readFileSync(join(dir,'documents-global-d1.safe.json'),'utf8'))
 assert.equal(report.result,'FAIL');assert.equal(report.failed_phase,'preflight');assert.equal(report.error,'D1_GLOBAL_EXPLICIT_DISPOSABLE_CI_ONLY');assert.deepEqual(report.checks,[]);assert.equal(report.command_failure,undefined);assert.equal(report.source,undefined);assert.equal(report.storage_88_adopted,false)
})
