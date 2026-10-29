import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fixture} from './synthetic-fixture.mjs'
import {directPreflight} from './contract.mjs'
test('direct model actual Compose normalization remains closed',{skip:process.platform!=='win32'},()=>{
 const d=mkdtempSync(join(tmpdir(),'crm-direct-parser-')),input=fixture(),file=join(d,'compose.json'),envfile=join(d,'empty.env')
 try{
 writeFileSync(file,JSON.stringify(input.configuration));writeFileSync(envfile,'')
 const r=spawnSync('docker-compose',['-p','crm-telecom-direct','--env-file',envfile,'-f',file,'config','--format','json'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,HOME:d,USERPROFILE:d,DOCKER_CONFIG:join(d,'empty')},shell:false})
 assert.equal(r.status,0,'PARSER_FAILED')
 const configuration=JSON.parse(r.stdout),result=directPreflight({...input,configuration})
 assert.equal(result.status,'CONFIGURATION_CHECKED',JSON.stringify({errors:result.errors,root:Object.keys(configuration),networks:configuration.networks,services:Object.fromEntries(Object.entries(configuration.services).map(([k,v])=>[k,Object.keys(v)]))}))
 }finally{rmSync(d,{recursive:true})}
})
