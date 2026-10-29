import {composePreflightV1} from '../asier_staging_network/compose-preflight.mjs'
export const project='crm-telecom-direct'
export const ingressAlias='crm-telecom-direct-ingress'
export const directNetworkPlan=Object.freeze(['crm-private','crm-outbound'].map(key=>Object.freeze({name:project+'_'+key,driver:'overlay',internal:key==='crm-private',attachable:true,owner:project})))
const old='crm-inmobiliario_crm-telecom-runtime'
export function bindNetworkIds(configuration,networks){
 const c=structuredClone(configuration)
 if(c.name!==project)throw Error('DIRECT_PROJECT_REQUIRED')
 for(const key of ['crm-private','crm-outbound']){
 const n=networks.find(n=>n.Name===project+'_'+key)
 if(!n||!/^[a-z0-9]{25}$/.test(n.Id)||n.Id!==n.CreatedId)throw Error('CREATED_NETWORK_ID_REQUIRED')
 c.networks[key]={external:true,name:n.Id}
 }
 return c
}
export function directConfiguration(configuration){
 const c=structuredClone(configuration)
 if(c.name!==old)throw Error('SOURCE_PROJECT_INVALID')
 c.name=project
 for(const name of ['crm-private','crm-outbound']){
  if(c.networks[name].name!==old+'_'+name)throw Error('SOURCE_NETWORK_INVALID')
  const n=c.networks[name]
  if(Object.keys(n).some(k=>!['name','driver','internal','attachable','labels','ipam'].includes(k))||n.driver!=='overlay'||n.attachable!==true||(name==='crm-private'?n.internal!==true:n.internal!==undefined&&n.internal!==false)||JSON.stringify(n.labels)!==JSON.stringify({'crm.scope':'crm-telecom-staging'})||n.ipam!==undefined&&(n.ipam===null||typeof n.ipam!=='object'||Array.isArray(n.ipam)||Object.keys(n.ipam).length!==0))throw Error('SOURCE_NETWORK_INVALID')
  c.networks[name]={name:project+'_'+name,external:true}
 }
 const s=c.secrets['crm-staging-ingress']
 if(s.name!==undefined){if(s.name!==old+'_crm-staging-ingress')throw Error('SOURCE_SECRET_IDENTITY_INVALID');s.name=project+'_crm-staging-ingress'}
 const ingress=c.services['crm-telecom-ingress'].networks.easypanel
 if(ingress!==null&&ingress!==undefined&&(typeof ingress!=='object'||Object.keys(ingress).length!==0))throw Error('SOURCE_INGRESS_OPTIONS_INVALID')
 c.services['crm-telecom-ingress'].networks.easypanel={aliases:[ingressAlias]}
 return c
}
export function directPreflight(input){
 try{
 const c=structuredClone(input.configuration)
 if(c.name!==project)throw Error()
 c.name=old
 for(const name of ['crm-private','crm-outbound']){
  if(c.networks[name].ipam!==undefined){if(c.networks[name].ipam===null||typeof c.networks[name].ipam!=='object'||Array.isArray(c.networks[name].ipam)||Object.keys(c.networks[name].ipam).length!==0)throw Error();delete c.networks[name].ipam}
  if(JSON.stringify(Object.keys(c.networks[name]).sort())!==JSON.stringify(['external','name'])||c.networks[name].external!==true)throw Error()
  const evidence=input.networks?.find(n=>n.Name===project+'_'+name)
  if(!evidence||!/^[a-z0-9]{25}$/.test(evidence.Id)||evidence.Id!==evidence.CreatedId||c.networks[name].name!==evidence.Id||evidence.Driver!=='overlay'||evidence.Scope!=='swarm'||evidence.Attachable!==true||evidence.Internal!==(name==='crm-private')||evidence.Labels?.['crm.direct.owner']!==project)throw Error()
  c.networks[name]={name:old+'_'+name,driver:'overlay',internal:name==='crm-private',attachable:true,labels:{'crm.scope':'crm-telecom-staging'}}
 }
 if(JSON.stringify(c.services['crm-telecom-ingress'].networks.easypanel)!==JSON.stringify({aliases:[ingressAlias]}))throw Error()
 c.services['crm-telecom-ingress'].networks.easypanel=null
 const s=c.secrets['crm-staging-ingress']
 if(s.name!==undefined){if(s.name!==project+'_crm-staging-ingress')throw Error();s.name=old+'_crm-staging-ingress'}
 return {...composePreflightV1({...input,configuration:c}),destination:{project,ingressAlias},deploying_authorized:false}
 }catch{return {status:'BLOCKED',errors:['DIRECT_IDENTITY_INVALID'],deploying_authorized:false}}
}
