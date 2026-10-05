import {createHash}from 'node:crypto'
import type {BillingInvoiceV1}from '../contracts/billing-v1'
import {renderBillingPdfV1}from './billing-pdf-v1.ts'
import {parseBillingReadV1}from './billing-query-runtime-v1.ts'
export const BILLING_ARTIFACT_RPC_V1={'invoice.persist_private_pdf':'billing_artifact_v1_attach'}as const
export {parseBillingArtifactInputV1,parseBillingArtifactReceiptV1,parseBillingArtifactReferenceV1}from '../contracts/billing-artifact-runtime-v1.ts'
/** Paid/overdue display facts must not change the frozen issued artifact. */
export function renderFrozenInvoicePdfV1(invoice:BillingInvoiceV1):Uint8Array|null{
 if(!['issued','paid'].includes(invoice.status)||parseBillingReadV1('invoice.get',{id:invoice.id},{contract_version:'billing.v1',operation:'invoice.get',invoice})===null)return null
 return renderBillingPdfV1({...invoice,status:'issued',paid_at:null,overdue:false})
}
export function billingArtifactChildCommandV1(command:string,invoice:string,step:string){
 const b=createHash('sha256').update('billing.artifact.v1:'+command+':'+invoice+':'+step).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const x=b.toString('hex');return x.slice(0,8)+'-'+x.slice(8,12)+'-'+x.slice(12,16)+'-'+x.slice(16,20)+'-'+x.slice(20)
}
