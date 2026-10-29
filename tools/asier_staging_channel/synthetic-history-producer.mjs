import {pinnedHistoryObjectIdsV1} from './private-history-batch.mjs'
import {collectSyntheticHistoryTransportV1} from './synthetic-history-transport.mjs'
import {withPrivateTransferFilesV1} from './private-scan-input.mjs'

// No ordinary or pinned-real execution path. Private callback receives only a
// nonce synthetic directory; raw buffers and paths never enter the safe report.
export async function syntheticPrivateHistoryProducerV1(options={}){
 if(options.mode!=='SYNTHETIC_ONLY')return{result:'NOT_RUN',publishing_authorized:false,security_accepted:false}
 if(options.ids?.some(id=>pinnedHistoryObjectIdsV1.includes(id)))return{result:'BLOCKED',error:'REAL_HISTORY_PRODUCER_NOT_CONNECTED',publishing_authorized:false,security_accepted:false}
 const receipt=await collectSyntheticHistoryTransportV1(options)
 if(receipt.result!=='SYNTHETIC_ONLY_PASS')return receipt
 let objects
 try{
  objects=receipt.takeObjects()
  const transfer=await withPrivateTransferFilesV1({parent:options.parent,objects,consume:options.consumeSyntheticTransfer})
  return{...transfer,transport_process_cleanup:receipt.process_cleanup}
 }catch{return{result:'BLOCKED',error:'SYNTHETIC_PRODUCER_BLOCKED',publishing_authorized:false,security_accepted:false}}
 finally{for(const row of objects??[])row.bytes.fill(0);receipt.dispose()}
}
