import {createHash}from 'node:crypto'
import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import type {BillingArtifactInputV1,BillingArtifactReceiptV1,BillingArtifactReferenceV1}from '../contracts/billing-artifact-v1'
import type {BillingInvoiceV1}from '../contracts/billing-v1'
import {renderBillingPdfV1}from './billing-pdf-v1.ts'
import {parseBillingReadV1}from './billing-query-runtime-v1.ts'
export const BILLING_ARTIFACT_RPC_V1={'invoice.persist_private_pdf':'billing_artifact_v1_attach'}as const
const keys=(v:Record<string,unknown>,s:string)=>Object.keys(v).sort().join(',')===s.split(',').sort().join(',')
const version=(v:unknown,min=1)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<1e15
export function parseBillingArtifactInputV1(v:unknown):BillingArtifactInputV1|null{try{return plain(v)&&keys(v,'command_id,id,expected_version,expected_artifact_version')&&uuid(v.command_id)&&uuid(v.id)&&version(v.expected_version)&&version(v.expected_artifact_version,0)?Object.freeze({...v,command_id:v.command_id.toLowerCase(),id:v.id.toLowerCase()})as BillingArtifactInputV1:null}catch{return null}}
export function parseBillingArtifactReceiptV1(input:BillingArtifactInputV1,v:unknown):BillingArtifactReceiptV1|null{
 try{return plain(v)&&keys(v,'contract_version,operation,command_id,id,version,status,invoice_id,document_id,renderer_version,verification_required')&&v.contract_version==='billing.artifact.v1'&&v.operation==='invoice.persist_private_pdf'&&v.command_id===input.command_id&&uuid(v.id)&&uuid(v.document_id)&&v.invoice_id===input.id&&v.version===input.expected_artifact_version+1&&v.status==='stored_candidate'&&v.renderer_version==='billing.snapshot.pdf.v1'&&v.verification_required===true?Object.freeze({...v})as BillingArtifactReceiptV1:null}catch{return null}
}
export function parseBillingArtifactReferenceV1(id:string,v:unknown):BillingArtifactReferenceV1|null{
 try{return plain(v)&&keys(v,'contract_version,operation,id,invoice_id,document_id,version,renderer_version,verification_required,document_status')&&v.contract_version==='billing.artifact.v1'&&v.operation==='invoice.private_pdf_reference'&&uuid(v.id)&&uuid(v.document_id)&&v.invoice_id===id&&version(v.version)&&v.renderer_version==='billing.snapshot.pdf.v1'&&v.verification_required===true&&['active','archived'].includes(v.document_status as string)?Object.freeze({...v})as BillingArtifactReferenceV1:null}catch{return null}
}
/** Paid/overdue display facts must not change the frozen issued artifact. */
export function renderFrozenInvoicePdfV1(invoice:BillingInvoiceV1):Uint8Array|null{
 if(!['issued','paid'].includes(invoice.status)||parseBillingReadV1('invoice.get',{id:invoice.id},{contract_version:'billing.v1',operation:'invoice.get',invoice})===null)return null
 return renderBillingPdfV1({...invoice,status:'issued',paid_at:null,overdue:false})
}
export function billingArtifactChildCommandV1(command:string,invoice:string,step:string){
 const b=createHash('sha256').update('billing.artifact.v1:'+command+':'+invoice+':'+step).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const x=b.toString('hex');return x.slice(0,8)+'-'+x.slice(8,12)+'-'+x.slice(12,16)+'-'+x.slice(16,20)+'-'+x.slice(20)
}
