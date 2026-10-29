import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {historicalLiteralDescriptorsV1} from './scan-historical-literals.mjs'

// Pure binary protocol only: no process, filesystem, network or real-object
// retrieval. Returned buffers are private capabilities, never JSON/report data.
const BLOB=1024*1024
const bounds=Object.freeze({bytes:3*(BLOB+100),chunks:1024,milliseconds:30000})
const blocked=()=>{throw Error('PRIVATE_HISTORY_BATCH_BLOCKED')}
export const pinnedHistoryObjectIdsV1=Object.freeze([...new Set(historicalLiteralDescriptorsV1.map(d=>d.blob))])
export const pinnedHistoryRequestV1=()=>Buffer.from(pinnedHistoryObjectIdsV1.join('\n')+'\n','ascii')

// Generic object IDs exist solely for low-level synthetic protocol contracts.
// Operational callers must use the pinned factory below, not supply new IDs.
export function syntheticGitBatchDecoderV1(ids,limits={}){
 if(!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||ids.some(id=>typeof id!=='string'||!/^[a-f0-9]{40}$/.test(id)))blocked()
 if(!limits||typeof limits!=='object'||Array.isArray(limits))blocked()
 const cap={...bounds},expected=[...ids],parts=[],started=performance.now()
 for(const [key,value] of Object.entries(limits)){
  if(!Object.hasOwn(bounds,key)||!Number.isSafeInteger(value)||value<1||value>bounds[key])blocked()
  cap[key]=value
 }
 let size=0,terminal=false
 const clear=()=>{for(const part of parts)part.fill(0);parts.length=0}
 const tick=()=>{if(terminal||performance.now()-started>cap.milliseconds)blocked()}
 return{
  feed(bytes){
   try{
    tick()
    if(!Buffer.isBuffer(bytes)||bytes.length===0||parts.length>=cap.chunks||bytes.length>cap.bytes-size)blocked()
    parts.push(Buffer.from(bytes));size+=bytes.length
   }catch{terminal=true;clear();blocked()}
  },
  finish(){
   let batch;const result=[]
   try{
    tick();terminal=true;batch=Buffer.concat(parts,size);let offset=0
    for(const id of expected){
     const end=batch.indexOf(10,offset)
     if(end<offset||end-offset>100)blocked()
     const header=batch.subarray(offset,end)
     if(header.some(value=>value>127))blocked()
     const fields=/^([a-f0-9]{40}) blob ([1-9][0-9]{0,6})$/.exec(header.toString('ascii'))
     if(!fields||fields[1]!==id)blocked()
     const length=Number(fields[2]);offset=end+1
     if(length>BLOB||offset+length>=batch.length||batch[offset+length]!==10)blocked()
     const bytes=batch.subarray(offset,offset+length)
     const actual=createHash('sha1').update(Buffer.from('blob '+length+'\0')).update(bytes).digest('hex')
     if(actual!==id)blocked()
     result.push({id,bytes:Buffer.from(bytes)});offset+=length+1
    }
    if(offset!==batch.length)blocked()
    return result
   }catch{for(const row of result)row.bytes.fill(0);terminal=true;blocked()}
   finally{batch?.fill(0);clear()}
  },
  abort(){terminal=true;clear()}
 }
}
export const pinnedHistoryBatchDecoderV1=limits=>syntheticGitBatchDecoderV1(pinnedHistoryObjectIdsV1,limits)
