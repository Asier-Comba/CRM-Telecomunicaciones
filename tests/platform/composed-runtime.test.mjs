import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {root} from '../../scripts/platform/lib.mjs'
test('composed assistant class requires and imports with the real Node transform mode',()=>{
 const env={...process.env};delete env.NODE_OPTIONS
 const code='import("./src/assistant/conversation-service-v2.ts").then(()=>console.log("IMPORT_PASS")).catch(e=>{console.log(e.code||"IMPORT_FAILED");process.exitCode=1})'
 const plain=spawnSync(process.execPath,['-e',code],{cwd:root,env,encoding:'utf8',timeout:30000})
 assert.notEqual(plain.status,0);assert.equal(plain.stdout.trim(),'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX')
 const transformed=spawnSync(process.execPath,['--experimental-transform-types','-e',code],{cwd:root,env,encoding:'utf8',timeout:30000})
 assert.equal(transformed.status,0);assert.equal(transformed.stdout.trim(),'IMPORT_PASS')
})
