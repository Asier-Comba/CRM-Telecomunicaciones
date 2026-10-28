import {readFileSync} from 'node:fs'
import {isDeepStrictEqual} from 'node:util'
import {validateReceipt} from '../asier_staging_channel/contract.mjs'
import {gatewayRuntimeSettingsV1} from './runtime.mjs'

export const composeDestination=Object.freeze({project:'crm-inmobiliario',service:'crm-telecom-runtime',ingress:'crm-telecom-ingress',port:8080,original_app:'crm-telecom-staging'})
const roles=['crm-telecom-staging','crm-telecom-ingress','crm-telecom-egress']
const serviceFields=['image','pull_policy','environment','user','read_only','cap_drop','security_opt','restart','stop_grace_period','logging','command','healthcheck','networks','secrets','tmpfs','mem_limit','cpus','dns','dns_opt']
const sameKeys=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&isDeepStrictEqual(Object.keys(value).sort(),[...keys].sort())
const subset=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key))
const empty=value=>value===undefined||value===null||sameKeys(value,[])
const sorted=value=>Array.isArray(value)?[...value].sort():null
const memory=value=>typeof value==='number'?value:typeof value==='string'&&/^\d+m$/.test(value)?Number(value.slice(0,-1))*1024*1024:NaN

// Only inspect the resolved `docker compose config --format json` document.
// This pure check cannot authenticate its receipt/reviews or authorize publication/deployment.
// Do not persist the input: resolved environment may contain private cohort/configuration.
export function composePreflightV1({configuration,receipt,expected,policy,binding}={}){
 const errors=new Set(),fail=code=>errors.add(code)
 let verified
 try{verified=validateReceipt(receipt,expected)}catch{fail('PRIVATE_IMAGE_RECEIPT_INVALID')}
 if(!subset(configuration,['name','services','networks','secrets'])||!sameKeys(configuration?.services,roles))fail('COMPOSE_SHAPE_INVALID')
 const networks=configuration?.networks
 if(!sameKeys(networks,['crm-private','crm-outbound','easypanel']))fail('NETWORK_SET_INVALID')
 for(const key of ['crm-private','crm-outbound']){
  const network=networks?.[key]
  if(!subset(network,['name','driver','internal','attachable','labels'])||network.driver!=='overlay'||network.attachable!==true||Boolean(network.internal)!==(key==='crm-private')||!sameKeys(network.labels,['crm.scope'])||network.labels['crm.scope']!=='crm-telecom-staging')fail('OWNED_NETWORK_INVALID')
  if(network?.name!==undefined&&network.name!==`crm-inmobiliario_crm-telecom-runtime_${key}`)fail('OWNED_NETWORK_NAME_INVALID')
 }
 if(!sameKeys(networks?.easypanel,['name','external'])||networks.easypanel.name!=='easypanel'||networks.easypanel.external!==true)fail('EXISTING_NETWORK_INVALID')
 if(configuration?.name!==undefined&&configuration.name!=='crm-inmobiliario_crm-telecom-runtime')fail('COMPOSE_PROJECT_INVALID')
 const secret=configuration?.secrets?.['crm-staging-ingress']
 if(!sameKeys(configuration?.secrets,['crm-staging-ingress'])||!subset(secret,['name','file'])||secret.file!=='/etc/crm-telecom-runtime/ingress.json'||secret.name!==undefined&&secret.name!=='crm-inmobiliario_crm-telecom-runtime_crm-staging-ingress')fail('INGRESS_SECRET_SOURCE_INVALID')
 const environmentNames=JSON.parse(readFileSync(new URL('../../infra/platform/environment-manifest.json',import.meta.url),'utf8')).entries.map(entry=>entry.name)
 let appEnvironment
 for(const name of roles){
  const service=configuration?.services?.[name],isApp=name===roles[0],isIngress=name===roles[1]
  if(!subset(service,serviceFields)){fail('SERVICE_FIELDS_INVALID');continue}
  if(!verified||service.image!==verified.image_reference)fail('SERVICE_IMAGE_MISMATCH')
  if(service.pull_policy!=='never')fail('UNCONTROLLED_IMAGE_PULL')
  if(service.user!=='65532:65532'||service.read_only!==true||!isDeepStrictEqual(service.cap_drop,['ALL'])||!isDeepStrictEqual(service.security_opt,['no-new-privileges:true']))fail('SERVICE_PRIVILEGES_INVALID')
  if(service.restart!=='on-failure:3'||service.stop_grace_period!=='35s'||!isDeepStrictEqual(service.logging,{driver:'json-file',options:{'max-size':'5m','max-file':'2'}}))fail('SERVICE_LIFECYCLE_INVALID')
  if(memory(service.mem_limit)!==(isApp?768:256)*1024*1024||Number(service.cpus)!==(isApp?0.75:0.25))fail('SERVICE_RESOURCE_BOUND_INVALID')
  const environment=service.environment
  if(!subset(environment,[...environmentNames,'HOSTNAME','PORT']))fail('SERVICE_ENVIRONMENT_FIELDS_INVALID')
  try{gatewayRuntimeSettingsV1(isIngress?'ingress':'egress',environment,policy,binding)}catch{fail('SERVICE_RUNTIME_ADMISSION_DENIED')}
  if(binding?.public_sha256!==verified?.public_build_sha256)fail('SERVICE_PUBLIC_BUILD_MISMATCH')
  for(const flag of ['PRODUCT_DOCUMENT_LIBRARY_ENABLED','PRODUCT_DOCUMENT_CONTENT_ENABLED','PRODUCT_DOCUMENT_MAINTENANCE_ENABLED','AI_ENABLED','CRM_EMAIL_ENABLED','NEXT_PUBLIC_ENABLE_DEMO_DATA','NEXT_PUBLIC_FORCE_OFFLINE_DEV'])if(environment?.[flag]!=='false')fail('SERVICE_CAPABILITIES_NOT_OFF')
  if(isApp){
   appEnvironment=environment
   if(environment?.HOSTNAME!=='0.0.0.0'||environment?.PORT!=='3000'||service.command!==undefined||service.healthcheck!==undefined)fail('APP_COMMAND_INVALID')
   if(!isDeepStrictEqual(service.dns,['127.0.0.1'])||!isDeepStrictEqual(service.dns_opt,['timeout:1','attempts:1']))fail('APP_DNS_INVALID')
  }else{
   const role=isIngress?'ingress':'egress'
   if(!isDeepStrictEqual(service.command,['tools/asier_staging_network/runtime.mjs',role])||service.dns!==undefined||service.dns_opt!==undefined)fail('HELPER_COMMAND_INVALID')
   const expectedEnvironment={...appEnvironment};delete expectedEnvironment.HOSTNAME;delete expectedEnvironment.PORT
   if(!isDeepStrictEqual(environment,expectedEnvironment))fail('ROLE_ENVIRONMENT_MISMATCH')
   const health=service.healthcheck
   if(!sameKeys(health,['test','interval','timeout','start_period'])||!Array.isArray(health.test)||health.test.length!==4||health.test[0]!=='CMD'||health.test[1]!=='/nodejs/bin/node'||health.test[2]!=='-e'||health.test[3]!==gatewayHealthProbe||health.interval!=='30s'||health.timeout!=='5s'||health.start_period!=='10s')fail('HELPER_HEALTHCHECK_INVALID')
  }
  const attached=isApp?['crm-private']:isIngress?['crm-private','easypanel']:['crm-private','crm-outbound']
  if(!sameKeys(service.networks,attached))fail('SERVICE_NETWORKS_INVALID')
  for(const key of attached){
   const network=service.networks?.[key],alias=key==='crm-private'&&!isIngress?[name]:null
   if(alias?!sameKeys(network,['aliases'])||!isDeepStrictEqual(network.aliases,alias):!empty(network))fail('SERVICE_NETWORK_OPTIONS_INVALID')
  }
  const tmpfs=isApp?['/tmp:size=64m,mode=1777','/app/.next/cache:size=128m,uid=65532,gid=65532']:['/tmp:size=16m,mode=1777']
  if(!isDeepStrictEqual(sorted(service.tmpfs),sorted(tmpfs)))fail('SERVICE_TMPFS_INVALID')
  if(isIngress){if(!isDeepStrictEqual(service.secrets,[{source:'crm-staging-ingress',target:'crm-staging-ingress'}]))fail('INGRESS_SECRET_MOUNT_INVALID')}
  else if(service.secrets!==undefined)fail('SECRET_OUTSIDE_INGRESS')
 }
 return {version:'staging.compose.preflight.v1',status:errors.size?'BLOCKED':'CONFIGURATION_CHECKED',errors:[...errors].sort(),destination:composeDestination,source:verified?.source??null,tree:verified?.tree??null,image_reference:verified?.image_reference??null,values_included:false,mutation_performed:false,publishing_authorized:false,deploying_authorized:false,external_evidence_verified:false,hosted_acceptance:'NOT_RUN'}
}

export const gatewayHealthProbe='const s=require("node:net").connect({host:"127.0.0.1",port:8080});s.setTimeout(2000);s.once("connect",()=>{s.destroy();process.exit(0)});s.once("error",()=>process.exit(1));s.once("timeout",()=>{s.destroy();process.exit(1)})'
