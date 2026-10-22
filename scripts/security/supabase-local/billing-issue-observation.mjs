import {createHash} from 'node:crypto'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Read-only evidence for the EXISTING CI disposable resource. No labels, IDs,
// fiscal snapshots, receipt body, credentials, or SQL errors enter the report.
export function observeInvoiceIssue({sql,origin,workspaceId,actorId,input}){
 if(process.env.GITHUB_ACTIONS!=='true'||origin!=='http://127.0.0.1:3109')return {observation:'NOT_RUN_OUTSIDE_DISPOSABLE_CI'}
 if(![workspaceId,actorId,input?.id,input?.command_id].every(v=>typeof v==='string'&&uuid.test(v))||!Number.isSafeInteger(input?.expected_version)||input.expected_version<1||input.expected_version>999999999999999)return {observation:'NOT_RUN_INVALID_IDENTITY'}
 try{
  const where=`workspace_id='${workspaceId}' and actor_id='${actorId}' and command_id='${input.command_id}'`
  const value=JSON.parse(sql(`with invoice as (
   select id,version,status,series,number_year,number_sequence from public.billing_invoices where workspace_id='${workspaceId}' and id='${input.id}'
  ), ledger as (
   select receipt from public.product_commands where ${where} and operation='invoice.issue'
  ), audit as (
   select entity_id,entity_version from public.product_audit_events where ${where} and operation='invoice.issued'
  ) select json_build_object(
   'ledger_rows',(select count(*) from ledger),
   'receipt_rows',(select count(*) from ledger where receipt is not null),
   'audit_rows',(select count(*) from audit),
   'entity_rows',(select count(*) from invoice),
   'entity_version',(select max(version) from invoice),
   'entity_issued',(select coalesce(bool_or(status='issued'),false) from invoice),
   'receipt_audit_entity_coherent',(select coalesce(bool_or(
    i.status='issued' and i.version=${input.expected_version+1} and a.entity_id=i.id and a.entity_version=i.version
    and c.receipt @> jsonb_build_object('contract_version','billing.v1','operation','invoice.issue','command_id','${input.command_id}','id','${input.id}','version',i.version,'status','issued')
    and c.receipt->'number'=jsonb_build_object('series',i.series,'year',i.number_year,'sequence',i.number_sequence)
   ),false) from invoice i cross join ledger c cross join audit a)
  )`).trim())
  const counts=['ledger_rows','receipt_rows','audit_rows','entity_rows']
  if(!counts.every(k=>Number.isSafeInteger(value[k])&&value[k]>=0&&value[k]<=1000)||!(value.entity_version===null||Number.isSafeInteger(value.entity_version)&&value.entity_version>0)||typeof value.entity_issued!=='boolean'||typeof value.receipt_audit_entity_coherent!=='boolean')return {observation:'UNAVAILABLE_INVALID_RESULT'}
  return {observation:'READ_ONLY',command_fingerprint:createHash('sha256').update(input.command_id).digest('hex'),ledger_rows:value.ledger_rows,receipt_rows:value.receipt_rows,audit_rows:value.audit_rows,entity_rows:value.entity_rows,entity_version:value.entity_version,entity_issued:value.entity_issued,receipt_audit_entity_coherent:value.receipt_audit_entity_coherent}
 }catch{return {observation:'UNAVAILABLE_READ_FAILED'}}
}
