// Classify actual authenticated responses; unavailable services prove nothing.
// Response bodies stay in memory and are never returned as audit evidence.
//
// Storage contract comes from the checkout under test, never from the restored
// database (a restore that lost policies must not change what is expected):
// - 87: the owner reads the private object directly with its user JWT.
// - 88 (migration 20261021090000): no user JWT reads document bytes directly,
//   the owner included; the owner's legitimate access is proven through a fresh
//   ticket, the user-JWT manifest RPC and a server-side fetch whose bytes match
//   the restored integrity record.
export const STORAGE_88_MIGRATION='20261021090000'
export function restoredStorageContract(migrations){
 if(!Array.isArray(migrations))throw new Error('RESTORED_STORAGE_CONTRACT_UNKNOWN')
 return migrations.some(m=>m?.version===STORAGE_88_MIGRATION)?'88':'87'
}
const directDenied=storage=>[400,404].includes(storage?.status)&&storage?.json?.message==='Object not found'
export function verifyRestoredPrivateResponses({owner,storage,assistant,contract='87',serverRead}){
 if(typeof owner!=='boolean')throw new Error('RESTORED_ACTOR_INVALID')
 if(!['87','88'].includes(contract))throw new Error('RESTORED_STORAGE_CONTRACT_UNKNOWN')
 if(contract==='88'){
  if(!directDenied(storage))throw new Error(owner?'RESTORED_STORAGE_OWNER_DIRECT_READ_NOT_CLOSED':'RESTORED_STORAGE_DENIAL_NOT_PROVEN')
  if(owner&&!(serverRead?.manifest==='PASS'&&serverRead?.bytes==='MATCH'))throw new Error('RESTORED_STORAGE_SERVER_READ_NOT_PROVEN')
 }else if(owner){
  if(storage?.status!==200)throw new Error('RESTORED_STORAGE_OWNER_NOT_PROVEN')
 }else if(!directDenied(storage))throw new Error('RESTORED_STORAGE_DENIAL_NOT_PROVEN')
 if(assistant?.status!==403||assistant?.json?.code!=='42501')throw new Error('RESTORED_ASSISTANT_DENIAL_NOT_PROVEN')
 return contract==='88'
  ?{storage_contract:'88',storage_direct:'DENIED',storage:owner?'AUTHORIZED_SERVER_ONLY':'DENIED',assistant_raw:'DENIED',response_values_included:false}
  :{storage:owner?'AUTHORIZED':'DENIED',assistant_raw:'DENIED',response_values_included:false}
}
export function verifyRestoredRpcDenial(response){
 if(response?.status!==403||response?.json?.code!=='42501')throw new Error('RESTORED_RPC_DENIAL_NOT_PROVEN')
 return {status:'PASS',response_values_included:false}
}
