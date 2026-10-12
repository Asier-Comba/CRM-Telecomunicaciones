import {parseCaseInputV1,parseCaseResultV1} from '../lib/server/case-runtime-v1.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {CaseInputsV1,CasePageV1} from '../lib/contracts/case-v1.ts'

/** Selected customer's registered case facts; no titles, notes, ancestry or
 * assignee IDs. A list is not independent operator/customer resolution proof. */
export function parseAssistantCaseListInputV1(raw:unknown):CaseInputsV1['case.list']|null{
 try{
  const value=snapshotProductJsonV1(raw)
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['customer_id','case_type','priority','status','due_from','due_to','limit','after_id'].includes(k)))return null
  const input=parseCaseInputV1('case.list',value) as CaseInputsV1['case.list']|null
  return input?.customer_id&&(input.limit??20)<=20?Object.freeze({...input,limit:input.limit??20}):null
 }catch{return null}
}
export function projectAuthorizedCaseListV1(rawInput:unknown,raw:unknown):Record<string,unknown>|null{
 try{
  const input=parseAssistantCaseListInputV1(rawInput)
  if(!input)return null
  const data=parseCaseResultV1('case.list',input,raw) as CasePageV1|null
  if(!data)return null
  return snapshotProductJsonV1({contract_version:'assistant.case-list.v1',operation:'case.list',items:data.items.map(row=>({
   id:row.id,case_type:row.case_type,priority:row.priority,status:row.status,due_on:row.due_on,resolved_at:row.resolved_at,
   closed_at:row.closed_at,resolution_code:row.resolution_code,cancellation_code:row.cancellation_code,overdue:row.overdue,source:row.source})),next_id:data.next_id}) as Record<string,unknown>
 }catch{return null}
}
