import {parseEquipmentInputV1,parseEquipmentReadV1} from '../lib/server/equipment-runtime-v1.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {EquipmentInputsV1,EquipmentReadV1} from '../lib/contracts/equipment-v1.ts'

/** Selected customer's registered equipment facts, never physical installation
 * proof, private model/description, purchase or association/history metadata. */
export function parseAssistantEquipmentListInputV1(raw:unknown):EquipmentInputsV1['equipment.list']|null{
 try{
  const value=snapshotProductJsonV1(raw)
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['customer_id','kind','status','limit','after_id'].includes(k)))return null
  const input=parseEquipmentInputV1('equipment.list',value)
  return input?.customer_id&&(input.limit??20)<=20?Object.freeze({...input,limit:input.limit??20}):null
 }catch{return null}
}
export function projectAuthorizedEquipmentListV1(rawInput:unknown,raw:unknown):Record<string,unknown>|null{
 try{
  const input=parseAssistantEquipmentListInputV1(rawInput);if(!input)return null
  const data=parseEquipmentReadV1('equipment.list',input,raw) as Extract<EquipmentReadV1,{operation:'equipment.list'}>|null
  if(!data)return null
  return snapshotProductJsonV1({contract_version:'assistant.equipment-list.v1',operation:'equipment.list',items:data.items.map(row=>({
   id:row.id,kind:row.kind,status:row.status,assigned_on:row.assigned_on,returned_on:row.returned_on,replaced_on:row.replaced_on,cancelled_on:row.cancelled_on,source:row.source,
  })),next_id:data.next_id}) as Record<string,unknown>
 }catch{return null}
}
