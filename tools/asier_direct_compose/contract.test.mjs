import test from 'node:test'
import assert from 'node:assert/strict'
import {invocation,project} from './contract.mjs'
import {protectedSession,sha256} from './session.mjs'
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const config={directory:'/protected/crm',source:'/protected/crm/compose.yaml',environment:'/protected/crm/interpolation.env',docker:'/usr/bin/docker',composeHash:'a'.repeat(64)}
test('executor fixed namespace, local daemon and no modifying lifecycle exposed',()=>{
 for(const mode of ['config','dry-run','stop']){
 const v=invocation(config,mode);assert.equal(v.shell,false);assert.equal(v.args.includes(project),true);assert.equal(v.args.includes('--remove-orphans'),false);assert.equal(v.deploying_authorized,false)
 }
 for(const mode of ['up','down','prune','restart','apply'])assert.throws(()=>invocation(config,mode))
 for(const key of ['directory','source','environment','docker'])assert.throws(()=>invocation({...config,[key]:'/safe/../foreign'},'config'))
 assert.throws(()=>invocation({...config,composeHash:'mutable'},'config'))
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
