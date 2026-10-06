import type{ServiceCommercialInputsV1,ServiceCommercialOperationV1,ServiceCommercialReceiptV1,ServiceInstallationV1,ServiceAddonPageV1}from '../contracts/telecom-service-commercial-v1'
import{snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import{isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import{isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
export const SERVICE_COMMERCIAL_RPC_V1={
 'service.installation_set':'service_commercial_v1_command',
 'service.addon_assign':'service_commercial_v1_command',
 'service.addon_end':'service_commercial_v1_command',
 'service.installation_get':'service_commercial_v1_query',
 'service.addon_list':'service_commercial_v1_query'
}as const
const req={
 'service.installation_set':['command_id','service_id','expected_service_version','expected_details_version','site_label','installation_contact_id','activation_target_on'],
 'service.addon_assign':['command_id','service_id','expected_service_version','component_position','quantity','valid_from','valid_until'],
 'service.addon_end':['command_id','service_id','id','expected_service_version','expected_version','ended_on'],
 'service.installation_get':['service_id'],
 'service.addon_list':['service_id']
}as const
const keys=(v:Record<string,unknown>,want:readonly string[])=>Object.keys(v).sort().join(',')===[...want].sort().join(',')
const date=(v:unknown):v is string=>isStrictCalendarDateV1(v)&&v>='2000-01-01'&&v<='2100-12-31'
const historicalDate=(v:unknown):v is string=>isStrictCalendarDateV1(v)&&v>='1900-01-01'&&v<='2199-12-31'
const int=(v:unknown,min=1,max=999999999999999)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max
const label=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=100&&!/[\u0000-\u001f\u007f-\u009f]/.test(v)
const source=(v:unknown)=>['manual','import','integration'].includes(v as string)
export function isServiceCommercialOperationV1(v:unknown):v is ServiceCommercialOperationV1{return typeof v==='string'&&Object.hasOwn(req,v)}
export function parseServiceCommercialInputV1<O extends ServiceCommercialOperationV1>(op:O,value:unknown):ServiceCommercialInputsV1[O]|null{try{
 if(!isServiceCommercialOperationV1(op))return null;const v=snapshotProductJsonV1(value),required:readonly string[]=req[op],optional=op==='service.addon_list'?['limit','after_id']:[]
 if(!plain(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...required,...optional].includes(k)))return null
 for(const[k,x]of Object.entries(v)){
 if(x===null&&['site_label','installation_contact_id','activation_target_on','valid_until'].includes(k))continue
 if(k==='id'||k.endsWith('_id')){if(!uuid(x))return null}
 else if(k==='site_label'){if(!label(x))return null}
 else if(['activation_target_on','valid_from','valid_until','ended_on'].includes(k)){if(!date(x))return null}
 else if(!int(x,k==='expected_details_version'?0:1,k==='component_position'?8:['quantity','limit'].includes(k)?100:999999999999999))return null
 }
 if(op==='service.addon_assign'&&v.valid_until!==null&&(v.valid_until as string)<(v.valid_from as string))return null
 return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,typeof x==='string'&&(k==='id'||k.endsWith('_id'))?x.toLowerCase():x])))as ServiceCommercialInputsV1[O]
}catch{return null}}
export function parseServiceCommercialReceiptV1(op:ServiceCommercialOperationV1,input:ServiceCommercialInputsV1[ServiceCommercialOperationV1],value:unknown):ServiceCommercialReceiptV1|null{try{
 const v=snapshotProductJsonV1(value),i=input as Record<string,unknown>
 if(!plain(v)||!keys(v,['contract_version','operation','command_id','id','service_id','service_version','version','status'])||v.contract_version!=='telecom.service_commercial.v1'||v.operation!==op||v.command_id!==i.command_id||!uuid(v.id)||v.service_id!==i.service_id||!int(v.service_version)||v.service_version!==(i.expected_service_version as number)+1||!int(v.version))return null
 if(op==='service.installation_set'){if(v.id!==i.service_id||v.version!==(i.expected_details_version as number)+1||v.status!=='recorded')return null}
 else if(op==='service.addon_assign'){if(v.version!==1||v.status!=='assigned')return null}
 else if(op==='service.addon_end'){if(v.id!==i.id||v.version!==(i.expected_version as number)+1||v.status!=='ended')return null}else return null
 return v as ServiceCommercialReceiptV1
}catch{return null}}
export function parseServiceCommercialReadV1(op:ServiceCommercialOperationV1,input:ServiceCommercialInputsV1[ServiceCommercialOperationV1],value:unknown):ServiceInstallationV1|ServiceAddonPageV1|null{try{
 const v=snapshotProductJsonV1(value),i=input as Record<string,unknown>
 if(!plain(v)||v.contract_version!=='telecom.service_commercial.v1'||v.operation!==op||v.service_id!==i.service_id)return null
 if(op==='service.installation_get'){
 if(!keys(v,['contract_version','operation','service_id','service_version','service_kind','source','plan_version_id','activated_on','ended_on','installation'])||!int(v.service_version)||!['mobile','fiber','fixed_voice','data_connectivity','other'].includes(v.service_kind as string)||!source(v.source)||v.plan_version_id!==null&&!uuid(v.plan_version_id)||v.activated_on!==null&&!historicalDate(v.activated_on)||v.ended_on!==null&&!historicalDate(v.ended_on)||v.activated_on!==null&&v.ended_on!==null&&(v.ended_on as string)<(v.activated_on as string))return null
 if(v.installation!==null){const d=v.installation;if(!plain(d)||!keys(d,['version','site_label','location_id','installation_contact_id','activation_target_on','source'])||!int(d.version)||d.site_label!==null&&!label(d.site_label)||d.location_id!==null&&!uuid(d.location_id)||d.installation_contact_id!==null&&!uuid(d.installation_contact_id)||d.activation_target_on!==null&&!date(d.activation_target_on)||!source(d.source)||d.source!==v.source||!['fiber','fixed_voice','data_connectivity'].includes(v.service_kind as string))return null}
 return v as ServiceInstallationV1
 }
 if(op!=='service.addon_list'||!keys(v,['contract_version','operation','service_id','as_of','items','next_id'])||!date(v.as_of)||!Array.isArray(v.items)||v.items.length>(i.limit as number??50))return null
 let previous=(i.after_id as string)??''
 for(const r of v.items){if(!plain(r)||!keys(r,['id','version','service_id','plan_version_id','component_position','addon_code','quantity','valid_from','valid_until','ended_on','source','timing_state'])||!uuid(r.id)||(r.id as string)<=previous||!int(r.version)||r.service_id!==i.service_id||!uuid(r.plan_version_id)||!int(r.component_position,1,8)||!int(r.quantity,1,100)||!['extra_data','international_calling','roaming','static_ip','device_financing'].includes(r.addon_code as string)||!date(r.valid_from)||r.valid_until!==null&&(!date(r.valid_until)||r.valid_until<r.valid_from)||r.ended_on!==null&&(!date(r.ended_on)||r.ended_on<r.valid_from||r.valid_until!==null&&r.ended_on>r.valid_until)||!source(r.source))return null
 const timing=r.ended_on!==null?'ended':r.valid_from>v.as_of?'planned':r.valid_until!==null&&r.valid_until<v.as_of?'expired':'current';if(r.timing_state!==timing)return null;previous=r.id as string
 }
 if(v.next_id!==null&&(!uuid(v.next_id)||v.items.length!==(i.limit as number??50)||v.next_id!==previous))return null
 return v as ServiceAddonPageV1
}catch{return null}}
