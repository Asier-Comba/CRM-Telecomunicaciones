import {connectWorker,inspectWorkerConnectionV3,closeWorkerV3} from './durable-native-driver-v3.mjs'
export {connectWorker}

/** Fixed probe driver for the existing IPC/exit controller, NOT full23. */
export async function execute(job){
 try{
  if(!job||Object.keys(job).sort().join(',')!=='action,fixture,scenario'||job.fixture!=='v3_connection_probe'
   ||job.scenario!=='connection_only'||job.action!=='read_same_connection')throw Error('NATIVE_CONNECTION_PROBE_INVALID')
  const first=await inspectWorkerConnectionV3(),second=await inspectWorkerConnectionV3()
  if(first.backend!==second.backend)throw Error('NATIVE_CONNECTION_PROBE_INVALID')
  await closeWorkerV3()
  return {contract:'assistant.durable-native-connection.v3',sameBackend:true,connectionClosed:true,full23:'NOT_RUN'}
 }finally{await closeWorkerV3()}
}
