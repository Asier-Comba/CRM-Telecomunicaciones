import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
/** Future server registry only. These contracts do not configure or execute a provider. */
export type RegisteredIntegrationClassV1='google_calendar'|'auth_mail'|'crm_mail'|'whatsapp'|'n8n'|'ai_provider'|'storage'
export type IntegrationStatusV1='not_configured'|'configured'|'degraded'|'unavailable'
export type RegisteredWorkflowIntentV1=Readonly<{integration_id:'n8n.primary';workflow_id:'crm.customer-created.v1';event:{kind:'customer.created';customer_id:string};idempotency_key:string}>
export function parseFutureWorkflowIntentV1(v:unknown):RegisteredWorkflowIntentV1|null{try{return plain(v)&&Object.keys(v).sort().join(',')==='event,idempotency_key,integration_id,workflow_id'&&v.integration_id==='n8n.primary'&&v.workflow_id==='crm.customer-created.v1'&&uuid(v.idempotency_key)&&plain(v.event)&&Object.keys(v.event).sort().join(',')==='customer_id,kind'&&v.event.kind==='customer.created'&&uuid(v.event.customer_id)?{integration_id:'n8n.primary',workflow_id:'crm.customer-created.v1',event:{kind:'customer.created',customer_id:v.event.customer_id.toLowerCase()},idempotency_key:v.idempotency_key.toLowerCase()}:null}catch{return null}}
export interface RegisteredWorkflowAdapterV1{
 readonly integrationId:'n8n.primary'
 readonly workflowId:'crm.customer-created.v1'
 status():IntegrationStatusV1
 executeRegistered(intent:RegisteredWorkflowIntentV1):Promise<{status:'succeeded';receiptId:string}|{status:'unavailable'|'failed';code:string}>
}
/** Provider implementations must verify signature before normalization, bind the
 * workspace from a server-owned registry, enforce size/event bounds and durably
 * dedupe provider event IDs. No generic browser URL or webhook route exists. */
export interface RegisteredInboxInboundAdapterV1{
 readonly providerId:'crm-mail.primary'|'whatsapp.primary'
 readonly maxBytes:number
 verifyAndNormalize(input:Readonly<{rawBytes:Uint8Array;signatureHeaders:Readonly<Record<string,string>>;serverTenantBinding:string}>):Promise<{ok:false;code:'signature_invalid'|'oversize'|'tenant_unavailable'|'invalid_event'}|{ok:true;providerEventId:string;workspaceId:string;channel:'crm_mail'|'whatsapp';body:string;receivedAt:string}>
}
// No concrete adapters instantiated. External actions remain unregistered.
