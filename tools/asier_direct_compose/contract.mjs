import {composePreflightV1} from '../asier_staging_network/compose-preflight.mjs'
export const project='crm-telecom-direct'
export const ingressAlias='crm-telecom-direct-ingress'
export const directNetworkPlan=Object.freeze(['crm-private','crm-outbound'].map(key=>Object.freeze({name:project+'_'+key,driver:'overlay',internal:key==='crm-private',attachable:true,owner:project})))
const old='crm-inmobiliario_crm-telecom-runtime'
export function directConfiguration(configuration){
 const c=structuredClone(configuration)
 if(c.name!==old)throw Error('SOURCE_PROJECT_INVALID')
 c.name=project
 for(const name of ['crm-private','crm-outbound']){
  if(c.networks[name].name!==old+'_'+name)throw Error('SOURCE_NETWORK_INVALID')
  c.networks[name]={name:project+'_'+name,external:true}
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
  if(JSON.stringify(Object.keys(c.networks[name]).sort())!==JSON.stringify(['external','name'])||c.networks[name].external!==true||c.networks[name].name!==project+'_'+name)throw Error()
  const evidence=input.networks?.find(n=>n.Name===project+'_'+name)
  if(!evidence||evidence.Driver!=='overlay'||evidence.Scope!=='swarm'||evidence.Attachable!==true||evidence.Internal!==(name==='crm-private')||evidence.Labels?.['crm.direct.owner']!==project)throw Error()
  c.networks[name]={name:old+'_'+name,driver:'overlay',internal:name==='crm-private',attachable:true,labels:{'crm.scope':'crm-telecom-staging'}}
 }
 if(JSON.stringify(c.services['crm-telecom-ingress'].networks.easypanel)!==JSON.stringify({aliases:[ingressAlias]}))throw Error()
 c.services['crm-telecom-ingress'].networks.easypanel=null
 const s=c.secrets['crm-staging-ingress']
 if(s.name!==undefined){if(s.name!==project+'_crm-staging-ingress')throw Error();s.name=old+'_crm-staging-ingress'}
 return {...composePreflightV1({...input,configuration:c}),destination:{project,ingressAlias},deploying_authorized:false}
 }catch{return {status:'BLOCKED',errors:['DIRECT_IDENTITY_INVALID'],deploying_authorized:false}}
}
