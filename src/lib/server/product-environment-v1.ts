export type ProductEnvironmentV1='LOCALDEV'|'TEST'|'STAGING'|'PROD'
export type ProductEnvironmentEntryV1=Readonly<{name:string;scope:string;secret:boolean;validator:string;runtime_status:string;required:Readonly<Record<ProductEnvironmentV1,boolean>>;required_when:Readonly<{name:string;equals:string}>|null}>
export type ProductEnvironmentManifestV1=Readonly<{manifest_version:string;values_included:boolean;entries:readonly ProductEnvironmentEntryV1[];alternative_required_groups:readonly Readonly<{names:readonly string[];minimum_present:number}>[]}>
const closed=new Set(['LOCALDEV','TEST','STAGING','PROD'])
function valid(kind:string,value:string,phase:ProductEnvironmentV1){
 if(value.length>8192||/[\u0000-\u001F\u007F]/.test(value))return false
 if(kind==='boolean')return['true','false'].includes(value)
 if(kind==='hex32')return/^[0-9a-f]{64}$/i.test(value)
 if(kind==='uuid')return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
 if(kind==='node_mode')return['production','development','test'].includes(value)
 if(kind==='app_environment')return['local','test','staging','production'].includes(value)
 if(kind==='disposable_adapter')return value==='disposable-local'&&phase==='TEST'
 if(kind==='port')return/^[1-9][0-9]{0,4}$/.test(value)&&Number(value)<=65535
 if(kind==='hostname')return/^[a-zA-Z0-9.-]{1,253}$/.test(value)&&!value.includes('..')
 if(kind==='email_address')return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=320
 if(kind==='public_api_key'){if(/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(value))return true;try{return/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)&&JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString()).role==='anon'}catch{return false}}
 if(['platform_url','origin_url','https_url'].includes(kind)){
  try{const u=new URL(value);if(u.username||u.password||u.hash||u.search)return false
   const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname)
   if(u.protocol!=='https:'&&!(kind!=='https_url'&&['LOCALDEV','TEST'].includes(phase)&&local&&u.protocol==='http:'))return false
   if(['STAGING','PROD'].includes(phase)&&local)return false
   return kind!=='origin_url'||u.pathname==='/'
  }catch{return false}
 }
 if(['nonempty','private_reference_or_key'].includes(kind))return value.trim()===value&&value.length>0
 return false
}
export function validateProductEnvironmentV1(manifest:ProductEnvironmentManifestV1,env:Readonly<Record<string,string|undefined>>,phase:ProductEnvironmentV1){
 const errors:{name:string;code:string}[]=[]
 if(!closed.has(phase)||manifest.manifest_version!=='crm.product.environment.v1'||manifest.values_included!==false)return{status:'invalid' as const,errors:[{name:'manifest',code:'invalid_contract'}]}
 const names=new Set<string>()
 for(const row of manifest.entries){
  if(!/^[A-Z][A-Z0-9_]*$/.test(row.name)||names.has(row.name)||row.secret&&row.name.startsWith('NEXT_PUBLIC_')){errors.push({name:'manifest',code:'invalid_entry'});continue}names.add(row.name)
  const value=env[row.name],required=row.required[phase]||row.required_when!==null&&env[row.required_when.name]===row.required_when.equals
  if(!value){if(required)errors.push({name:row.name,code:'missing'});continue}
  if(!valid(row.validator,value,phase))errors.push({name:row.name,code:'invalid'})
 }
 for(const group of manifest.alternative_required_groups)if(group.names.filter(n=>!!env[n]).length<group.minimum_present)errors.push({name:group.names.join('_OR_'),code:'missing_alternative'})
 const key=!!env.PRODUCT_DOCUMENT_VERIFY_KEY_HEX,id=!!env.PRODUCT_DOCUMENT_VERIFY_KEY_ID
 if(key!==id)errors.push({name:'PRODUCT_DOCUMENT_VERIFY_KEY_ID_AND_KEY_HEX',code:'incomplete_pair'})
 if(env.IMPORT_STAGING_ADAPTER==='disposable-local'&&env.NODE_ENV!=='test')errors.push({name:'NODE_ENV',code:'disposable_requires_test_process'})
 return{status:errors.length?'invalid'as const:'valid'as const,environment:phase,errors,provider_connections_verified:false as const,production_mail_verified:false as const,production_import_verified:false as const}
}
export function mailProductionReadinessV1(){
 return{contract_version:'mail.readiness.v1',auth_mail:{channel:'platform_auth_smtp',status:'not_configured',provider_adapter:'unregistered',sender_domain:'unverified',site_url:'production_unverified',callbacks:'production_unverified',live_delivery:'not_tested'},crm_mail:{channel:'separate_crm_delivery_adapter',status:'not_configured',provider_adapter:'unregistered',sender_domain:'unverified',live_delivery:'not_tested'},credentials_exposed:false,configured_flag_is_connection_proof:false}
}
