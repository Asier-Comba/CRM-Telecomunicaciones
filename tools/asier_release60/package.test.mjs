import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { assembleRuntime, checkRuntime, regularFiles, runtimeCopies } from './package.mjs'
import { isolatedEnvironment } from './smoke.mjs'

const dockerfile=readFileSync(new URL('../../infra/deployment/Dockerfile',import.meta.url),'utf8')
function fixture(action){
  const dir=mkdtempSync(join(tmpdir(),'crm-release60-test-')),source=join(dir,'source'),out=join(dir,'runtime')
  const put=(path,value='synthetic')=>{const full=join(source,path);mkdirSync(resolve(full,'..'),{recursive:true});writeFileSync(full,value)}
  for(const path of ['.next/standalone/server.js','.next/standalone/package.json','.next/standalone/.next/BUILD_ID','.next/static/chunks/a.css','public/icon.svg','scripts/platform/entrypoint.mjs','infra/platform/environment-manifest.json'])put(path)
  put('infra/deployment/Dockerfile',dockerfile)
  try{action({dir,source,out,put})}finally{
    const target=resolve(dir);assert.ok(target.startsWith(resolve(tmpdir())+sep+'crm-release60-test-'));rmSync(target,{recursive:true,force:true})
  }
}
test('raw Next standalone lacks required copied assets and platform entrypoint',()=>fixture(({source})=>{
  assert.throws(()=>checkRuntime(join(source,'.next/standalone')),/RUNTIME_COPY_INCOMPLETE/)
}))
test('existing Docker copy contract assembles complete runtime without changing source',()=>fixture(({source,out})=>{
  const before=regularFiles(source).length,result=assembleRuntime(source,out)
  assert.equal(result.files,7);assert.equal(checkRuntime(out).files,7);assert.equal(regularFiles(source).length,before)
  assert.equal(readFileSync(join(out,'.next/static/chunks/a.css'),'utf8'),'synthetic')
}))
test('a new Docker COPY requires an explicit contract review',()=>{
  assert.throws(()=>runtimeCopies(dockerfile+'\nCOPY --from=build --chown=65532:65532 /app/.env ./\n'),/COPY_CONTRACT_REVIEW_REQUIRED/)
})
test('output cannot overwrite existing data or be nested in source',()=>fixture(({source,out})=>{
  assert.throws(()=>assembleRuntime(source,join(source,'result')),/NEW_EXTERNAL_OUTPUT_REQUIRED/)
  mkdirSync(out);writeFileSync(join(out,'keep.txt'),'preserve')
  assert.throws(()=>assembleRuntime(source,out),/NEW_EXTERNAL_OUTPUT_REQUIRED/)
  assert.equal(readFileSync(join(out,'keep.txt'),'utf8'),'preserve')
}))
test('dotenv, signing material and Next cache fail closed before copy',()=>{
  for(const path of ['.next/standalone/.env.local','.next/standalone/private.key','.next/standalone/.next/cache/transient.bin'])fixture(({source,out,put})=>{
    put(path);assert.throws(()=>assembleRuntime(source,out),/SECRET_FILE_FORBIDDEN|NON_RUNTIME_STATE_FORBIDDEN/)
  })
})
test('runtime symlink/junction is rejected rather than following external content',()=>fixture(({dir,source,out})=>{
  const external=join(dir,'external');mkdirSync(external);writeFileSync(join(external,'private.txt'),'synthetic')
  symlinkSync(external,join(source,'.next/standalone/external'),process.platform==='win32'?'junction':'dir')
  assert.throws(()=>assembleRuntime(source,out),/RUNTIME_LINK_REQUIRES_REVIEW/)
}))
test('output parent alias cannot hide a destination inside source',()=>fixture(({dir,source})=>{
  const alias=join(dir,'alias');symlinkSync(source,alias,process.platform==='win32'?'junction':'dir')
  assert.throws(()=>assembleRuntime(source,join(alias,'new-output')),/NEW_EXTERNAL_OUTPUT_REQUIRED/)
}))
test('isolated child environment never inherits provider credentials or public backend bindings',()=>{
  const result=isolatedEnvironment()
  for(const name of ['OPENAI_API_KEY','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','PRODUCT_STAGING_USER_IDS'])assert.equal(result[name],undefined)
  assert.equal(result.PRODUCT_V1_ENABLED,'false');assert.equal(result.PLATFORM_TARGET,'LOCAL')
})
