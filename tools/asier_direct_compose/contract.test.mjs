import test from 'node:test'
import assert from 'node:assert/strict'
import {executePreparation} from './executor.mjs'
import {protectedSession,sha256} from './session.mjs'
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
test('preparation refuses every modifying lifecycle before accessing files',async()=>{
 for(const mode of ['up','down','stop','prune','restart','apply'])await assert.rejects(executePreparation('/unavailable',{},mode),/EXECUTION_NOT_AUTHORIZED/)
 await assert.rejects(executePreparation('/unavailable',{},'config'),/COMPLETE_INVENTORY_REQUIRED/)
})
test('lock excludes another operator and changed inputs fail before continuation',{skip:process.platform==='win32'},async()=>{
 const d=mkdtempSync(join(tmpdir(),'crm-direct-'));const f=join(d,'source');writeFileSync(f,'original',{mode:0o600})
 try{
 await protectedSession(d,{source:sha256('original')},async verify=>{
 await assert.rejects(protectedSession(d,{},()=>{}))
 writeFileSync(f,'changed');assert.throws(verify,/INPUT_HASH_CHANGED/)
 writeFileSync(f,'original')
 })
 assert.equal(existsSync(join(d,'.crm-direct.lock')),false)
 await assert.rejects(protectedSession(d,{source:sha256('other')},()=>assert.fail()))
 }finally{rmSync(d,{recursive:true})}
})
