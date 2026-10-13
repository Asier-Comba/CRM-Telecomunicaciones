import assert from 'node:assert/strict'
import {snapshotDurableBindingScopeV3} from '../../../src/assistant/durable-audit-observation-v3.ts'
import {connectWorker,inspectWorkerOperationV3,closeWorkerV3} from './durable-native-driver-v3.mjs'

/** Consume only the existing owned native cluster. This measures a fixed
 * operation read on the driver's admitted connection, not a business scenario
 * or its effect absence, restart, authorization count or complete ledger. */
export async function verifyNativeDriverOperationSliceV3(query,rawScope){
 const scope=snapshotDurableBindingScopeV3(rawScope)
 if(typeof query!=='function'||!scope)throw Error('NATIVE_DRIVER_OPERATION_SLICE_UNAVAILABLE')
 let backend,operation
 try{
  backend=await connectWorker()
  operation=await inspectWorkerOperationV3(scope)
  assert.deepEqual(operation,{operationCount:1,state:'completed'})
 }finally{await closeWorkerV3()}
 // The independent fixture port checks only disappearance of this owned
 // connection. This is never proof of business-effect absence/quiescence.
 assert.equal(await query(`select count(*) from pg_stat_activity where datname='telecom_test' and pid=${backend};`),'0')
 return Object.freeze({operation,sameBackend:true,ownedBackendAbsent:true,full23:'NOT_RUN'})
}
