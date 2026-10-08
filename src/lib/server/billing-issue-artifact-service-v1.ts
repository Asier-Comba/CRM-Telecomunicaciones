import {BillingServiceV1}from './billing-service-v1.ts'
import {billingArtifactChildCommandV1}from './billing-artifact-runtime-v1.ts'
import type {ProductUserPortV1}from './product-service-v1'
import type {BillingOperationV1}from '../contracts/billing-v1'
import type {BillingArtifactServiceV1}from './billing-artifact-service-v1'
/** Fiscal receipt stays authoritative even if the optional Storage phase fails. */
export class BillingIssueArtifactServiceV1 extends BillingServiceV1{
 readonly #factory:()=>Promise<BillingArtifactServiceV1|null>;readonly #enabled:boolean
 constructor(port:ProductUserPortV1,factory:()=>Promise<BillingArtifactServiceV1|null>,enabled:boolean){super(port);this.#factory=factory;this.#enabled=enabled}
 override async execute(op:BillingOperationV1,input:unknown){
  const r=await super.execute(op,input)
  if(this.#enabled&&op==='invoice.issue'&&r.ok){
   try{const service=await this.#factory();if(service)await service.persist({command_id:billingArtifactChildCommandV1(r.receipt.command_id,r.receipt.id,'after_issue'),id:r.receipt.id,expected_version:r.receipt.version,expected_artifact_version:0})}catch{/* The committed issue and pending job survive optional artifact failure. */}
  }
  return r
 }
}
