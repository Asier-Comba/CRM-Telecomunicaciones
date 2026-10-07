import {test} from 'node:test'
import assert from 'node:assert/strict'
import {importRegisteredWorkflow,exportRegisteredWorkflow,n8nGuard} from '../../scripts/platform/n8n-registry.mjs'
import {readJson} from '../../scripts/platform/lib.mjs'
const env={PLATFORM_TARGET:'STAGING',N8N_BASE_URL:'https://n8n.example.invalid',N8N_APPROVED_ORIGIN:'https://n8n.example.invalid',N8N_API_KEY:'synthetic-canary',CI:'true',GITHUB_ACTIONS:'true',PLATFORM_ALLOW_N8N_IMPORT:'true'}
test('registry import is bound to approved staging origin and remains inactive',async()=>{
 const entry=readJson('infra/n8n/registry.json').workflows[0],calls=[]
 const r=await importRegisteredWorkflow(entry,env,async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({id:'synthetic-id',active:false})}})
 assert.equal(r.status,'IMPORTED_INACTIVE');assert.equal(r.effects_enabled,false);assert.ok(!JSON.stringify(r).includes('synthetic-canary'));assert.equal(calls[0].body.nodes.length,2)
 assert.throws(()=>n8nGuard({...env,PLATFORM_TARGET:'PROD'},true),/STAGING/)
 assert.throws(()=>n8nGuard({...env,N8N_APPROVED_ORIGIN:'https://wrong.invalid'},true),/STAGING/)
 await assert.rejects(()=>importRegisteredWorkflow(entry,env,async()=>({ok:true,json:async()=>({id:'id',active:true})})),/NOT_VERIFIED_INACTIVE/)
})
test('n8n export never removes credential evidence to make an unsafe workflow look safe',()=>{
 const w=readJson('infra/n8n/synthetic-health.json');assert.equal(exportRegisteredWorkflow({...w,id:'provider-id'}).active,false)
 assert.throws(()=>exportRegisteredWorkflow({...w,nodes:[{...w.nodes[0],credentials:{token:'private'}}]}),/UNSAFE_WORKFLOW_EXPORT/)
})
