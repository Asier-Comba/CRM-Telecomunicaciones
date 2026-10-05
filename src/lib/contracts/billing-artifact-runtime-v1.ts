import {isClosedObjectV1 as plain,isUuidV1 as uuid}from '../server/product-work-runtime-v1.ts'
import type {BillingArtifactInputV1,BillingArtifactReceiptV1,BillingArtifactReferenceV1}from './billing-artifact-v1'
const keys=(v:Record<string,unknown>,s:string)=>Object.keys(v).sort().join(',')===s.split(',').sort().join(',')
const version=(v:unknown,min=1)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<1e15
export function parseBillingArtifactInputV1(v:unknown):BillingArtifactInputV1|null{try{return plain(v)&&keys(v,'command_id,id,expected_version,expected_artifact_version')&&uuid(v.command_id)&&uuid(v.id)&&version(v.expected_version)&&version(v.expected_artifact_version,0)?Object.freeze({...v,command_id:v.command_id.toLowerCase(),id:v.id.toLowerCase()})as BillingArtifactInputV1:null}catch{return null}}
export function parseBillingArtifactReceiptV1(input:BillingArtifactInputV1,v:unknown):BillingArtifactReceiptV1|null{
 try{return plain(v)&&keys(v,'contract_version,operation,command_id,id,version,status,invoice_id,document_id,renderer_version,verification_required')&&v.contract_version==='billing.artifact.v1'&&v.operation==='invoice.persist_private_pdf'&&v.command_id===input.command_id&&uuid(v.id)&&uuid(v.document_id)&&v.invoice_id===input.id&&v.version===input.expected_artifact_version+1&&v.status==='stored_candidate'&&v.renderer_version==='billing.snapshot.pdf.v1'&&v.verification_required===true?Object.freeze({...v})as BillingArtifactReceiptV1:null}catch{return null}
}
export function parseBillingArtifactReferenceV1(id:string,v:unknown):BillingArtifactReferenceV1|null{
 try{return plain(v)&&keys(v,'contract_version,operation,id,invoice_id,document_id,version,renderer_version,verification_required,document_status')&&v.contract_version==='billing.artifact.v1'&&v.operation==='invoice.private_pdf_reference'&&uuid(v.id)&&uuid(v.document_id)&&v.invoice_id===id&&version(v.version)&&v.renderer_version==='billing.snapshot.pdf.v1'&&v.verification_required===true&&['active','archived'].includes(v.document_status as string)?Object.freeze({...v})as BillingArtifactReferenceV1:null}catch{return null}
}
