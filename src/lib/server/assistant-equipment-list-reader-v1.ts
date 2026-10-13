import type {ProductUserPortV1} from './product-service-v1.ts'
import {EquipmentServiceV1} from './equipment-service-v1.ts'
import {parseAssistantEquipmentListInputV1} from '../../assistant/equipment-read-projection-v1.ts'

/** Only bounded equipment.list can reach existing cookie-scope W1 resolution. */
export function createAssistantEquipmentListReaderV1(port:ProductUserPortV1){
 const service=new EquipmentServiceV1(port)
 return async(operation:unknown,raw:unknown)=>{
  if(operation!=='equipment.list')return{ok:false as const,error:'validation' as const}
  const input=parseAssistantEquipmentListInputV1(raw)
  return input?service.execute('equipment.list',input):{ok:false as const,error:'validation' as const}
 }
}
