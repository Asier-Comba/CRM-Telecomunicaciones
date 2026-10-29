import {composePreflightV1} from '../asier_staging_network/compose-preflight.mjs'
export const project='crm-telecom-direct'
export const ingressAlias='crm-telecom-direct-ingress'
const old='crm-inmobiliario_crm-telecom-runtime'
export function directConfiguration(configuration){
 const c=structuredClone(configuration)
 if(c.name!==old)throw Error('SOURCE_PROJECT_INVALID')
 c.name=project
 for(const name of ['crm-private','crm-outbound']){
  if(c.networks[name].name!==old+'_'+name)throw Error('SOURCE_NETWORK_INVALID')
  c.networks[name].name=project+'_'+name
 }
 const s=c.secrets['crm-staging-ingress']
 if(s.name!==undefined)s.name=project+'_crm-staging-ingress'
 c.services['crm-telecom-ingress'].networks.easypanel={aliases:[ingressAlias]}
 return c
}
export function directPreflight(input){
 try{
 const c=structuredClone(input.configuration)
 if(c.name!==project)throw Error()
 c.name=old
 for(const name of ['crm-private','crm-outbound']){
  if(c.networks[name].name!==project+'_'+name)throw Error()
  c.networks[name].name=old+'_'+name
 }
 if(JSON.stringify(c.services['crm-telecom-ingress'].networks.easypanel)!==JSON.stringify({aliases:[ingressAlias]}))throw Error()
 c.services['crm-telecom-ingress'].networks.easypanel=null
 const s=c.secrets['crm-staging-ingress']
 if(s.name!==undefined){if(s.name!==project+'_crm-staging-ingress')throw Error();s.name=old+'_crm-staging-ingress'}
 return {...composePreflightV1({...input,configuration:c}),destination:{project,ingressAlias},deploying_authorized:false}
 }catch{return {status:'BLOCKED',errors:['DIRECT_IDENTITY_INVALID'],deploying_authorized:false}}
}
export function invocation({directory,source,environment,docker,composeHash},operation){
 for(const p of [directory,source,environment,docker])if(typeof p!=='string'||!/^\/[a-zA-Z0-9_./-]+$/.test(p)||p.split('/').includes('..'))throw Error('ABSOLUTE_PROTECTED_PATH_REQUIRED')
 if(!/^[a-f0-9]{64}$/.test(composeHash))throw Error('EXECUTOR_HASH_REQUIRED')
 if(!['config','dry-run','stop'].includes(operation))throw Error('EXECUTION_NOT_AUTHORIZED')
 const args=['--host','unix:///var/run/docker.sock','compose','--project-name',project,'--project-directory',directory,'--env-file',environment,'--file',source]
 return {executable:docker,args:[...args,...operation==='config'?['config','--format','json']:operation==='dry-run'?['--dry-run','up','--no-build','--pull','never','-d']:['stop']],shell:false,deploying_authorized:false}
}
