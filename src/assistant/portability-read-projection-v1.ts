import {parsePortabilityInputV1,parsePortabilityResultV1} from '../lib/server/portability-runtime-v1.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {PortabilityInputsV1,PortabilityPageV1} from '../lib/contracts/portability-v1.ts'

/** Only the authorized customer's bounded list. Get/commands, complete numbers,
 * identifier/ancestry/operator/assignee IDs and private audit times are excluded. */
export function parseAssistantPortabilityListInputV1(raw:unknown):PortabilityInputsV1['portability.list']|null{
 try{
  const value=snapshotProductJsonV1(raw)
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['customer_id','status','direction','window_from','window_to','limit','after_id'].includes(k)))return null
  const input=parsePortabilityInputV1('portability.list',value) as PortabilityInputsV1['portability.list']|null
  return input?.customer_id&&(input.limit??20)<=20?Object.freeze({...input,limit:input.limit??20}):null
 }catch{return null}
}
export function projectAuthorizedPortabilityListV1(rawInput:unknown,raw:unknown):Record<string,unknown>|null{
 try{
  const input=parseAssistantPortabilityListInputV1(rawInput)
  if(!input)return null
  const data=parsePortabilityResultV1('portability.list',input,raw) as PortabilityPageV1|null
  if(!data)return null
  return snapshotProductJsonV1({contract_version:'assistant.portability-list.v1',operation:'portability.list',
   items:data.items.map(row=>({id:row.id,masked_display:row.masked_display,direction:row.direction,status:row.status,
    requested_on:row.requested_on,submitted_on:row.submitted_on,scheduled_on:row.scheduled_on,started_on:row.started_on,
    completed_on:row.completed_on,closed_on:row.closed_on,reason_code:row.reason_code,source:row.source})),next_id:data.next_id}) as Record<string,unknown>
 }catch{return null}
}
