import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanupSwarmLabV1} from './swarm-cleanup.mjs'
const prefix='crm-p0-123456abcdef'
const owned={prefix,services:[prefix+'-app'],networks:[prefix+'-private'],secret:prefix+'-ingress',swarm:true}
const success=args=>({status:0,stdout:args[0]==='info'?'inactive\n':'',stderr:''})
test('failed teardown operation remains FAIL even if final resource lists are empty',async()=>{
 const commands=[];let removed=false
 const result=await cleanupSwarmLabV1(owned,args=>{commands.push(args);return args[0]==='secret'&&args[1]==='rm'?{status:1,stdout:'',stderr:'secret is in use by private detail not for evidence'}:success(args)},async()=>{},()=>{removed=true})
 assert.equal(result.ok,false);assert.equal(removed,true);assert.equal(result.absence.secrets,'ABSENT')
 assert.equal(result.steps.find(s=>s.operation==='secret_remove').error,'IN_USE')
 assert.equal(JSON.stringify(result).includes('private detail'),false)
 assert.ok(commands.some(args=>args[0]==='network'&&args[1]==='rm'));assert.ok(commands.some(args=>args[0]==='swarm'&&args[1]==='leave'))
})
test('denied readback cannot claim resource absence even when remove returned success',async()=>{
 const result=await cleanupSwarmLabV1(owned,args=>args[0]==='network'&&args[1]==='ls'?{status:1,stdout:'',stderr:'permission denied'}:success(args),async()=>{},async()=>{})
 assert.equal(result.ok,false);assert.equal(result.absence.networks,'UNKNOWN')
 assert.equal(result.steps.find(s=>s.operation==='readback_networks').error,'PERMISSION_DENIED')
})
test('cleanup rejects foreign resource names before any Docker operation',async()=>{
 let calls=0
 await assert.rejects(cleanupSwarmLabV1({...owned,services:['another-app']},()=>calls++,async()=>{},async()=>{}),/OWNED_LAB_RESOURCES_REQUIRED/)
 assert.equal(calls,0)
})

test('retained stopped owned task is explicitly removed without force before cleanup can pass',async()=>{
 const id='a'.repeat(64);let present=true,removed=0
 const result=await cleanupSwarmLabV1(owned,args=>{
  if(args[0]==='ps')return{status:0,stdout:present?id+'\n':'',stderr:''}
  if(args[0]==='container'&&args[1]==='inspect')return{status:0,stdout:prefix+'|'+owned.services[0]+'|false|exited\n',stderr:''}
  if(args[0]==='container'&&args[1]==='rm'){assert.deepEqual(args,['container','rm',id]);present=false;removed++;return success(args)}
  return success(args)
 },async()=>{},async()=>{})
 assert.equal(result.ok,true);assert.equal(removed,1);assert.equal(result.absence.containers,'ABSENT')
})

for(const scenario of ['running','foreign_service','inspection_denied'])test('teardown never removes an unconfirmed or running container: '+scenario,async()=>{
 const id='b'.repeat(64);let removals=0
 const result=await cleanupSwarmLabV1(owned,args=>{
  if(args[0]==='ps')return{status:0,stdout:id+'\n',stderr:''}
  if(args[0]==='container'&&args[1]==='inspect')return scenario==='inspection_denied'?{status:1,stdout:'',stderr:'permission denied'}:{status:0,stdout:prefix+'|'+(scenario==='foreign_service'?'other-service':owned.services[0])+'|'+(scenario==='running'?'true|running':'false|exited')+'\n',stderr:''}
  if(args[0]==='container'&&args[1]==='rm'){removals++;return success(args)}
  return success(args)
 },async()=>{},async()=>{})
 assert.equal(result.ok,false);assert.equal(removals,0);assert.equal(result.absence.containers,'PRESENT')
})
