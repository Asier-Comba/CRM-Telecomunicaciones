import {createNativeDurableOperationInspectorV3} from './durable-operation-inspection-v3.mjs'
const unavailable=()=>Error('DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE')
const statement="select jsonb_build_object('backend',pg_backend_pid(),'database',current_database(),'application',current_setting('application_name'));"

/** A connection consumer, never a cluster/resource constructor. The production
 * driver supplies the existing owned native-session constructor. */
export function createDurableNativeWorkerConnectionV3(open){
 if(typeof open!=='function')throw unavailable()
 let phase='idle',session,backend,application,query,close,opening,closing
 const retire=async()=>{if(close){const ownedClose=close;close=null;await ownedClose.call(session)}}
 async function connectWorker(){
  if(phase!=='idle')throw unavailable()
  phase='connecting'
  opening=(async()=>{
   try{
    session=await open()
    query=session?.query;close=session?.close;backend=session?.backend;application=session?.application
    if(typeof close!=='function'||typeof query!=='function'||!Number.isSafeInteger(backend)||backend<1
     ||typeof application!=='string'||!/^durable_node_[a-f0-9]{32}$/.test(application))throw unavailable()
    if(phase!=='connecting')throw unavailable()
    phase='connected';return backend
   }catch{phase='unavailable';try{await retire()}catch{};throw unavailable()}
  })()
  return opening
 }
 async function inspectWorkerConnection(){
  if(phase!=='connected')throw unavailable()
  try{
   const row=JSON.parse(await query.call(session,statement))
   if(phase!=='connected'||!row||Object.keys(row).sort().join(',')!=='application,backend,database'
    ||row.backend!==backend||row.database!=='telecom_test'||row.application!==application)throw unavailable()
   return Object.freeze({backend})
  }catch{phase='unavailable';try{await retire()}catch{};throw unavailable()}
 }
 async function inspectWorkerOperation(rawScope){
  if(phase!=='connected')throw unavailable()
  try{
   // Reuse the exact existing binding/row validator and fixed readonly query.
   // Capture its binding before the first await, then fence the same owned
   // connection before and after the operation read. No full-scenario counters.
   const inspector=createNativeDurableOperationInspectorV3(async sql=>{
    if(phase!=='connected')throw unavailable()
    const row=await query.call(session,sql)
    if(phase!=='connected')throw unavailable()
    return row
   },rawScope)
   await inspectWorkerConnection()
   const operation=await inspector.inspect()
   await inspectWorkerConnection()
   return operation
  }catch{phase='unavailable';try{await retire()}catch{};throw unavailable()}
 }
 function closeWorker(){
  if(closing)return closing
  const pending=opening;phase='closing'
  closing=(async()=>{try{if(pending)await pending.catch(()=>{});await retire()}catch{throw unavailable()}finally{phase='closed'}})()
  return closing
 }
 return Object.freeze({connectWorker,inspectWorkerConnection,inspectWorkerOperation,closeWorker})
}
