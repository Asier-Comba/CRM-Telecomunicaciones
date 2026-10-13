// IPC-only W2 fixture worker. One measured native connection for the typed call.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {canonicalArgumentsV1} from '../../../src/assistant/runtime.ts'
import {openPersistentNativeFixtureSessionV1} from './persistent-fixture-session.mjs'
import {createDurableReservationPortV1} from '../../../src/assistant/durable-reservation-port.ts'

const literal=value=>"'"+String(value).replaceAll("'","''")+"'"
const send=value=>process.send?.(value)
let session,stage='CONNECT'
try {
 const job=await new Promise(resolve=>process.once('message',resolve))
 assert.equal(job.mode,'reserve_start')
 const {workspace,actor,capability,commit}=job
 assert.equal(commit.actor.actorId,actor);assert.equal(commit.actor.workspaceId,workspace)
 assert.equal(commit.binding.actorId,actor);assert.equal(commit.binding.workspaceId,workspace);assert.equal(commit.binding.capability,capability)
 session=await openPersistentNativeFixtureSessionV1()
 await session.query(`set request.jwt.claim.sub=${literal(actor)};`)
 send({phase:'connected',pid:process.pid,backend:session.backend,application:session.application})
 await new Promise(resolve=>process.once('message',m=>{assert.equal(m.phase,'start');resolve()}))
 stage='PREPARE'
 commit.actor.permissions=new Set(commit.actor.permissions)
 const port=createDurableReservationPortV1({authority:async()=>({actorId:actor,workspaceId:workspace,permissions:new Set([capability])}),
  invoke:async(operation,input,signal)=>{
   const rpcFields={assistant_durable_v1_start_execution:['p_workspace','p_operation','p_capability','p_digest','p_version'],
    assistant_durable_v1_confirm_reserve:['p_workspace','p_confirmation','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request']}
   assert.ok(Object.hasOwn(rpcFields,operation))
   const fields=rpcFields[operation]
   assert.equal(Object.keys(input).sort().join(','),[...fields].sort().join(','))
   const data=JSON.parse(await session.query(`select public.${operation}(${fields.map(k=>literal(input[k])).join(',')});`,signal))
   return {data,error:null}
  }})
 assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
 send({phase:'prepared',pid:process.pid,backend:session.backend})
 stage='COMMIT_BARRIER'
 await new Promise(resolve=>process.once('message',m=>{assert.equal(m.phase,'release');resolve()}))
 stage='COMMIT'
 const reservation=await port.confirmReserveEnqueue(commit.actor,{confirmationRef:commit.confirmationRef,binding:commit.binding,idempotencyKey:commit.idempotencyKey,command:commit.command})
 assert.ok(['reserved','existing'].includes(reservation.status));assert.equal(reservation.record.state,'reserved');assert.equal(reservation.record.version,1)
 assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
 send({phase:'reserved',pid:process.pid,backend:session.backend,status:reservation.status,operationRef:reservation.record.operationRef,
  recordDigest:createHash('sha256').update(canonicalArgumentsV1(reservation.record)).digest('hex')})
 stage='COMMIT_BARRIER'
 await new Promise(resolve=>process.once('message',m=>{assert.equal(m.phase,'authorize');resolve()}))
 stage='COMMIT'
 const decision=await port.startExecution(commit.actor,reservation.record.operationRef,commit.binding,commit.expectedVersion)
 assert.ok(['applied','version_conflict'].includes(decision.status))
 if(decision.status==='applied'){
  assert.equal(decision.record.operationRef,reservation.record.operationRef);assert.equal(decision.record.state,'executing')
  assert.equal(decision.record.version,commit.expectedVersion+1);assert.deepEqual(decision.record.binding,commit.binding)
 }
 stage='READBACK'
 assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
 stage='RESULT'
 send({phase:'result',pid:process.pid,backend:session.backend,status:decision.status})
} catch {
 send({phase:'failed',code:'INDEPENDENT_RECONCILIATION_WORKER_FAILED',stage})
} finally {
 if(session)await session.close()
 if(process.connected)process.disconnect()
}
