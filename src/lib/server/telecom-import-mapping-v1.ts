import {decodeBoundedImportCsvV1} from './import-csv-v1.ts'
import {money} from './catalog-runtime-v1.ts'
import {CATALOG_ENTITLEMENTS_V1} from './catalog-specs-v1.ts'

/** Safe metadata only. This module validates candidates; it never applies domain writes. */
type Rule = Readonly<{type:'text'|'uuid'|'date'|'integer'|'boolean'|'enum';required?:boolean;values?:readonly string[];ref?:string;max?:number}>
const text = (required=true,max=200):Rule => ({type:'text',required,max})
const ref = (kind:string,required=true):Rule => ({type:'uuid',required,ref:kind})
const choice = (values:readonly string[],required=true):Rule => ({type:'enum',values,required})
const date = (required=false):Rule => ({type:'date',required})
const integer:Rule = {type:'integer',required:true}
const boolean:Rule = {type:'boolean',required:true}
const serviceKinds = ['mobile','fiber','fixed_voice','data_connectivity','other']
const source = choice(['manual','import','integration'])
const id:Rule = {type:'uuid',required:true}
const common = {id,source}
export const TELECOM_SAFE_IMPORT_SCHEMAS_V1 = {
 customers:{...common,account_kind:choice(['legal_entity','sole_trader']),legal_name:text(),trade_name:text(false),lifecycle:choice(['lead','prospect','customer','former_customer']),status:choice(['active','inactive','archived']),archived_on:date()},
 contacts:{...common,customer_id:ref('customers'),display_name:text(true,160),job_title:text(false,160),is_primary:boolean,status:choice(['active','inactive','archived']),archived_on:date()},
 operators:{...common,code:text(true,64),display_name:text(),status:choice(['active','inactive'])},
 plans:{...common,operator_id:ref('operators'),code:text(true,64),display_name:text(),service_kind:choice(serviceKinds),status:choice(['active','retired'])},
 plan_versions:{...common,plan_id:ref('plans'),version_number:integer,valid_from:date(true),valid_until:date(),currency:text(true,3),recurring_amount_minor:integer,one_time_amount_minor:integer,is_bundle:boolean},
 entitlements:{...common,plan_version_id:ref('plan_versions'),code:choice(['data_mib','unlimited_data','voice_minutes','unlimited_voice','sms_count','unlimited_sms','download_mbps','upload_mbps','access_technology','roaming_zone','commitment_months','promotion_months']),component_position:{...integer,required:false},integer_value:{...integer,required:false},boolean_value:{...boolean,required:false},text_value:text(false,120)},
 bundle_components:{...common,plan_version_id:ref('plan_versions'),position:integer,component_kind:choice(['base','add_on']),service_kind:choice(serviceKinds),addon_code:choice(['extra_data','international_calling','roaming','static_ip','device_financing'],false),quantity:integer},
 contracts:{...common,customer_id:ref('customers'),operator_id:ref('operators'),plan_version_id:ref('plan_versions',false),start_date:date(true),signed_date:date(),end_date:date(),status:choice(['draft','pending','active','ended','cancelled'])},
 services:{...common,customer_id:ref('customers'),contract_id:ref('contracts'),operator_id:ref('operators'),plan_version_id:ref('plan_versions',false),service_kind:choice(serviceKinds),display_name:text(),status:choice(['pending','active','suspended','ended','cancelled']),activated_on:date(),ended_on:date()},
 lines:{...common,service_id:ref('services'),display_name:text(),status:choice(['pending','active','suspended','ended','cancelled']),activated_on:date(),ended_on:date()},
 renewals:{...common,contract_id:ref('contracts'),target_on:date(true),opens_on:date(),closes_on:date(),status:choice(['open','completed','dismissed'])},
 permanences:{...common,contract_id:ref('contracts'),service_id:ref('services',false),commitment_kind:choice(['minimum_term','device','subsidy','discount','other']),starts_on:date(true),ends_on:date(true),status:choice(['open','completed','cancelled','not_applicable'])},
 sims:{...common,customer_id:ref('customers'),operator_id:ref('operators'),kind:choice(['physical','esim']),display_label:text(),status:choice(['prepared','assigned','active','replaced','inactive','cancelled']),line_id:ref('lines',false)},
 portabilities:{...common,line_id:ref('lines'),number_identifier_id:ref('number_identifiers'),donor_operator_id:ref('operators'),target_operator_id:ref('operators'),direction:choice(['inbound','outbound']),requested_on:date(true),scheduled_on:date(),completed_on:date(),status:choice(['draft','requested','scheduled','in_progress','completed','rejected','cancelled'])},
 cases:{...common,customer_id:ref('customers'),contract_id:ref('contracts',false),service_id:ref('services',false),line_id:ref('lines',false),case_type:choice(['activation','portability','technical','billing','renewal','cancellation','documentation','other']),title:text(),priority:choice(['low','normal','high','urgent']),due_on:date(),status:choice(['open','in_progress','waiting_customer','waiting_operator','resolved','closed','cancelled'])},
 service_locations:{...common,customer_id:ref('customers'),label:text(),country:{type:'text',required:true,max:2}},
 equipment:{...common,customer_id:ref('customers'),contract_id:ref('contracts',false),service_id:ref('services',false),line_id:ref('lines',false),commitment_id:ref('permanences',false),kind:choice(['router','ont','mobile_terminal','other']),manufacturer:text(),model:text(),commercial_description:text(false),purchased_on:date(),assigned_on:date(),status:choice(['prepared','assigned','returned','replaced','cancelled'])},
} satisfies Record<string,Record<string,Rule>>
export type TelecomSafeImportKindV1 = keyof typeof TELECOM_SAFE_IMPORT_SCHEMAS_V1
export type SafeImportRowV1 = Readonly<Record<string,string|boolean|null>>
export type SafeImportIssueV1 = Readonly<{row:number;field:string;code:'invalid_columns'|'invalid_value'|'duplicate_id'|'duplicate_key'|'foreign_key'|'ancestry'|'invalid_dates'}>
export type SafeImportPreviewV1 = Readonly<{contract_version:'telecom_import.v1';kind:TelecomSafeImportKindV1;total_rows:number;valid_rows:number;invalid_rows:number;rows:readonly Readonly<{row:number;data:SafeImportRowV1}>[];errors:readonly SafeImportIssueV1[];next_row:number|null;processing_status:'validated_metadata_only';production_ready:false}>
const uuid = (s:string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
const fail = () => {throw new Error('TELECOM_IMPORT_INVALID')}
const isDate = (s:string) => /^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s
function cell(rule:Rule,value:string):string|boolean|null|undefined {
 const s=value.trim()
 if(!s)return rule.required?undefined:null
 if(/^[=+@-]/.test(s)||/[\u0000-\u001f\u007f-\u009f]/.test(s))return undefined
 if(rule.type==='uuid')return uuid(s)?s.toLowerCase():undefined
 if(rule.type==='date')return isDate(s)?s:undefined
 if(rule.type==='integer')return /^(0|[1-9][0-9]{0,14})$/.test(s)?s:undefined
 if(rule.type==='boolean')return s==='true'?true:s==='false'?false:undefined
 if(rule.type==='enum')return rule.values?.includes(s)?s:undefined
 return s.length<=(rule.max??200)?s:undefined
}
type Candidate = {row:number;data:SafeImportRowV1;issues:SafeImportIssueV1[]}
function decode(kind:TelecomSafeImportKindV1,bytes:Uint8Array):Candidate[] {
 if(!Object.hasOwn(TELECOM_SAFE_IMPORT_SCHEMAS_V1,kind))fail()
 const schema:Record<string,Rule>=TELECOM_SAFE_IMPORT_SCHEMAS_V1[kind]
 const records=decodeBoundedImportCsvV1(bytes),headers=records[0]
 if(records.length<2||!headers||new Set(headers).size!==headers.length||headers.some(h=>!Object.hasOwn(schema,h))||Object.entries(schema).some(([k,r])=>r.required&&!headers.includes(k)))fail()
 const seen=new Set<string>(),natural=new Set<string>()
 return records.slice(1).map((values,index)=>{
  const row=index+1,data:Record<string,string|boolean|null>={},issues:SafeImportIssueV1[]=[]
  if(values.length!==headers.length)issues.push({row,field:'',code:'invalid_columns'})
  for(const [k,rule]of Object.entries(schema)){
   const pos=headers.indexOf(k),value=cell(rule,pos<0?'':values[pos]??'')
   if(value===undefined)issues.push({row,field:k,code:'invalid_value'});else data[k]=value
  }
  const duplicate=(value:unknown,set:Set<string>,code:'duplicate_id'|'duplicate_key')=>{if(typeof value==='string'){if(set.has(value))issues.push({row,field:'id',code});set.add(value)}}
  duplicate(data.id,seen,'duplicate_id')
  if(kind==='operators')duplicate(data.code,natural,'duplicate_key')
  if(kind==='plans')duplicate(String(data.operator_id)+':'+data.code,natural,'duplicate_key')
  if(kind==='plan_versions')duplicate(String(data.plan_id)+':'+data.version_number,natural,'duplicate_key')
  if(kind==='bundle_components')duplicate(String(data.plan_version_id)+':'+data.position,natural,'duplicate_key')
  if(kind==='entitlements')duplicate(String(data.plan_version_id)+':'+data.component_position+':'+data.code,natural,'duplicate_key')
  for(const[start,end]of [['valid_from','valid_until'],['start_date','end_date'],['activated_on','ended_on'],['opens_on','closes_on'],['starts_on','ends_on'],['requested_on','scheduled_on'],['requested_on','completed_on'],['purchased_on','assigned_on']]){
   if(typeof data[start]==='string'&&typeof data[end]==='string'&&data[start]>data[end])issues.push({row,field:end,code:'invalid_dates'})
  }
  if(['customers','contacts'].includes(kind)&&((data.status==='archived')!==(data.archived_on!==null)))issues.push({row,field:'archived_on',code:'invalid_dates'})
  if(['operators','plans'].includes(kind)&&!(/^[a-z0-9][a-z0-9_-]{0,63}$/.test(String(data.code))))issues.push({row,field:'code',code:'invalid_value'})
  if(kind==='plan_versions'&&(!/^[A-Z]{3}$/.test(String(data.currency))||!money(data.recurring_amount_minor)||!money(data.one_time_amount_minor)))issues.push({row,field:'currency',code:'invalid_value'})
  if(kind==='equipment'&&(String(data.manufacturer).length>100||String(data.model).length>100||data.service_id!==null&&data.contract_id===null||data.line_id!==null&&data.service_id===null||data.commitment_id!==null&&data.contract_id===null))issues.push({row,field:'service_id',code:'ancestry'})
  if(kind==='service_locations'&&!/^[A-Z]{2}$/.test(String(data.country)))issues.push({row,field:'country',code:'invalid_value'})
  if(kind==='bundle_components'&&(data.quantity==='0'||Number(data.quantity)>100||data.position==='0'||Number(data.position)>8||(data.component_kind==='add_on')!==(data.addon_code!==null)))issues.push({row,field:'component_kind',code:'invalid_value'})
  if(kind==='plan_versions'&&data.version_number==='0')issues.push({row,field:'version_number',code:'invalid_value'})
  if(kind==='portabilities'&&data.donor_operator_id===data.target_operator_id)issues.push({row,field:'target_operator_id',code:'invalid_value'})
  if(kind==='entitlements'){
   const expected=['unlimited_data','unlimited_voice','unlimited_sms'].includes(String(data.code))?'boolean_value':['access_technology','roaming_zone'].includes(String(data.code))?'text_value':'integer_value'
   const rule=CATALOG_ENTITLEMENTS_V1[data.code as keyof typeof CATALOG_ENTITLEMENTS_V1]
   if(rule?.kind==='text'&&!(rule.values as readonly string[]).includes(String(data.text_value)))issues.push({row,field:'text_value',code:'invalid_value'})
   if(rule?.kind==='integer'&&typeof data.integer_value==='string'&&/^[0-9]+$/.test(data.integer_value)&&(BigInt(String(data.integer_value??'0'))>BigInt('1000000000000')||['commitment_months','promotion_months'].includes(String(data.code))&&BigInt(String(data.integer_value??'0'))>BigInt('60')||['download_mbps','upload_mbps'].includes(String(data.code))&&(BigInt(String(data.integer_value??'0'))<BigInt('1')||BigInt(String(data.integer_value??'0'))>BigInt('1000000'))))issues.push({row,field:'integer_value',code:'invalid_value'})
   if(['integer_value','boolean_value','text_value'].some(k=>(data[k]!==null)!==(k===expected)))issues.push({row,field:expected,code:'invalid_value'})
  }
  return {row,data:Object.freeze(data),issues}
 })
}
export type SafeImportScopeV1=Readonly<{workspaceId:string;actorId:string;role:'owner'|'admin'}>
export type SafeImportReferenceV1=Readonly<{id:string;kind:string;workspaceId:string;customer_id?:string;contract_id?:string;service_id?:string;operator_id?:string;plan_id?:string;line_id?:string}>
/** A registered worker supplies the current actor and scoped FK facts, never a CSV workspace column. */
export interface SafeImportReferencePortV1 {
 resolve():Promise<SafeImportScopeV1|null>
 lookup(workspaceId:string,kind:string,id:string):Promise<SafeImportReferenceV1|null>
}
export async function validateTelecomSafeImportV1(kind:TelecomSafeImportKindV1,bytes:Uint8Array,port:SafeImportReferencePortV1,afterRow=0,limit=20):Promise<SafeImportPreviewV1> {
 if(!Number.isSafeInteger(afterRow)||afterRow<0||!Number.isSafeInteger(limit)||limit<1||limit>20)fail()
 const scope=await port.resolve()
 if(!scope||!uuid(scope.workspaceId)||!uuid(scope.actorId)||!['owner','admin'].includes(scope.role))throw new Error('TELECOM_IMPORT_ACCESS_DENIED')
 const candidates=decode(kind,bytes),schema:Record<string,Rule>=TELECOM_SAFE_IMPORT_SCHEMAS_V1[kind],cache=new Map<string,SafeImportReferenceV1|null>()
 for(const c of candidates){
  if(c.issues.length)continue
  const refs:SafeImportReferenceV1[]=[]
  for(const [field,rule]of Object.entries(schema)){
   const value=c.data[field];if(!rule.ref||typeof value!=='string')continue
   const key=rule.ref+':'+value
   if(!cache.has(key))cache.set(key,await port.lookup(scope.workspaceId,rule.ref,value))
   const record=cache.get(key)
   if(!record||record.id!==value||record.kind!==rule.ref||record.workspaceId!==scope.workspaceId)c.issues.push({row:c.row,field,code:'foreign_key'})
   else refs.push(record)
  }
  for(const field of ['customer_id','contract_id','service_id','operator_id','plan_id','line_id'] as const){
   const explicit=c.data[field],inferred=refs.map(r=>r[field]).filter((v):v is string=>typeof v==='string')
   if(new Set([...(typeof explicit==='string'?[explicit]:[]),...inferred]).size>1)c.issues.push({row:c.row,field,code:'ancestry'})
  }
 }
 const current=await port.resolve()
 if(!current||current.workspaceId!==scope.workspaceId||current.actorId!==scope.actorId||!['owner','admin'].includes(current.role))throw new Error('TELECOM_IMPORT_ACCESS_DENIED')
 const window=candidates.filter(c=>c.row>afterRow).slice(0,limit),valid=candidates.filter(c=>!c.issues.length)
 return Object.freeze({contract_version:'telecom_import.v1',kind,total_rows:candidates.length,valid_rows:valid.length,invalid_rows:candidates.length-valid.length,rows:window.filter(c=>!c.issues.length).map(c=>({row:c.row,data:c.data})),errors:window.flatMap(c=>c.issues),next_row:window.length&&window.at(-1)!.row<candidates.length?window.at(-1)!.row:null,processing_status:'validated_metadata_only',production_ready:false})
}
