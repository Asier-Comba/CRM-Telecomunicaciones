import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {prepareProjection,storage88} from './projection.mjs'
const root=new URL('../../',import.meta.url)
test('validates all D1 source then projects exact historical87 plus W5 Storage88 in an owned empty directory',()=>{
 const dir=mkdtempSync(join(tmpdir(),'crm-p0-schema88-unit-'))
 try{
  const result=prepareProjection(root,dir,'crm-telecom-p0-schema88-1')
  assert.equal(result.source_validated_count,88);assert.equal(result.count,88);assert.equal(result.hosted_mutation,false)
  assert.deepEqual(result.excluded_d1,['20261027154155_documents_library_v2.sql'])
  assert.deepEqual(Object.values(result.flags),[false,false,false,false,false])
  const files=readdirSync(join(dir,'supabase','migrations')).sort()
  assert.equal(files.length,88);assert.equal(files.at(-1),storage88.path.split('/').at(-1))
  assert.ok(!files.includes('20261027154155_documents_library_v2.sql'))
  const config=readFileSync(join(dir,'supabase','config.toml'),'utf8')
  assert.match(config,/project_id = "crm-telecom-p0-schema88-1"/);assert.match(config,/major_version = 17/)
  assert.throws(()=>prepareProjection(root,dir,'crm-telecom-p0-schema88-1'),/EMPTY_OWNED_DIRECTORY_REQUIRED/)
  assert.throws(()=>prepareProjection(root,dir,'staging'),/DISPOSABLE_PROJECT_REQUIRED/)
 }finally{
  const target=resolve(dir),parent=resolve(tmpdir())
  assert.equal(target.slice(0,parent.length+1).toLowerCase(),(parent+requireSeparator()).toLowerCase());assert.ok(target.slice(parent.length+1).startsWith('crm-p0-schema88-unit-'))
  rmSync(target,{recursive:true})
 }
})
function requireSeparator(){return process.platform==='win32'?'\\':'/'}
