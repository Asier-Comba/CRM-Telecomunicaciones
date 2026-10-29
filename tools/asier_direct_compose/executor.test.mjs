import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fixture} from './synthetic-fixture.mjs'
import {sha256} from './session.mjs'
import {executePreparation} from './executor.mjs'
test('actual preparation checks binary bytes, resolved model and clean argv; no authority',{skip:process.platform==='win32'},async()=>{
 const d=mkdtempSync(join(tmpdir(),'crm-direct-exec-')),f=fixture(),inventory={}
 const contents={'compose-bin':'synthetic test binary', 'compose.json':JSON.stringify(f.configuration),'interpolation.env':'','receipt.json':JSON.stringify(f.receipt),'expected.json':JSON.stringify(f.expected),'policy.json':JSON.stringify(f.policy),'binding.json':JSON.stringify(f.binding),'networks.json':JSON.stringify(f.networks)}
 for(const [name,text]of Object.entries(contents)){writeFileSync(join(d,name),text,{mode:name==='compose-bin'?0o700:0o600});inventory[name]=sha256(text)}
 let called=0
 const spawn=(binary,args,options)=>{called++;assert.equal(binary,join(d,'compose-bin'));assert.equal(options.shell,false);assert.equal(options.env.DOCKER_HOST,'unix:///var/run/docker.sock');assert.equal(options.env.COMPOSE_FILE,undefined);assert.equal(args.includes('crm-telecom-direct'),true);return {status:0,stdout:JSON.stringify(f.configuration)}}
 try{
 const result=await executePreparation(d,inventory,'config',spawn)
 assert.equal(result.deploying_authorized,false);assert.equal(called,1)
 writeFileSync(join(d,'compose-bin'),'modified')
 await assert.rejects(executePreparation(d,inventory,'config',spawn),/INPUT_HASH_CHANGED/);assert.equal(called,1)
 assert.equal(existsSync(join(d,'.crm-direct.lock')),false)
 }finally{rmSync(d,{recursive:true})}
})
