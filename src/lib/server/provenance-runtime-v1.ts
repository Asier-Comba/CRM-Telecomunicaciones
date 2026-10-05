import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import type {ProvenanceInputV1,ProvenanceResultV1}from '../contracts/provenance-v1'
export function parseProvenanceInputV1(v:unknown):ProvenanceInputV1|null{
 try{return plain(v)&&Object.keys(v).sort().join(',')==='id,kind'&&uuid(v.id)&&['customer','contact','opportunity','contract','service','line','renewal','permanence'].includes(v.kind as string)?Object.freeze({...v,id:v.id.toLowerCase()})as ProvenanceInputV1:null}catch{return null}
}
export function parseProvenanceResultV1(i:ProvenanceInputV1,v:unknown):ProvenanceResultV1|null{
 try{if(!plain(v)||Object.keys(v).sort().join(',')!=='confidence,contract_version,declared_source,id,kind,operation,verified_at'||v.contract_version!=='provenance.v1'||v.operation!=='provenance.get'||v.kind!==i.kind||v.id!==i.id||!['manual','import','integration'].includes(v.declared_source as string)||!['verified_new_manual','declared_legacy_manual','declared_external'].includes(v.confidence as string))return null
 if(v.confidence==='verified_new_manual'?v.declared_source!=='manual'||typeof v.verified_at!=='string'||v.verified_at.length>40||!Number.isFinite(Date.parse(v.verified_at)):v.verified_at!==null||v.confidence!==(v.declared_source==='manual'?'declared_legacy_manual':'declared_external'))return null
 return Object.freeze({...v})as ProvenanceResultV1}catch{return null}
}
