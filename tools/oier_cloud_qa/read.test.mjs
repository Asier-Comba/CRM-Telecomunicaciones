import {test} from 'node:test'
import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import {IntegratedLocalProductRepository} from '../../src/features/product/integration/repository.ts'
import {browserRead} from './read.mjs'
// Local transport comparison only: a controlled refusal avoids any backend/DB dispatch.
// This cannot be counted as a successful tenant denial or authenticated cloud run.
for(const operation of ['customer.editor','invoice.get'])test(`hosted ${operation} uses the actual product repository route and request envelope`,async()=>{
 const id='10000000-0000-4000-8000-000000000001',requests=[]
 const transport=async(url,init)=>{requests.push({url,method:init.method,credentials:init.credentials,cache:init.cache,body:JSON.parse(init.body)});return Response.json({ok:false,error:'not_found'},{status:404})}
 const repository=new IntegratedLocalProductRepository(transport)
 await assert.rejects(operation==='customer.editor'?repository.customer(id):repository.billing('invoice.get',{id}))
 const original=globalThis.fetch
 try{globalThis.fetch=transport;await browserRead({operation,id})}finally{globalThis.fetch=original}
 assert.equal(existsSync(new URL('../../src/app'+requests[0].url+'/route.ts',import.meta.url)),true,'actual frontend endpoint must have a registered Next route')
 assert.deepEqual(requests[1],requests[0],'QA must use the same registered endpoint, credentials, cache and closed envelope as the real UI repository')
})
