// Synthetic test data only. Never a publication receipt or policy override.
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
import {directConfiguration,bindNetworkIds} from './contract.mjs'
export function fixture(){
 const c=createRequire(import.meta.url)('js-yaml').load(readFileSync(new URL('../asier_staging_network/compose.proposed.yaml',import.meta.url),'utf8'))
 delete c['x-crm-runtime'];delete c['x-gateway-health']
 const env={BACKUP_RETENTION_DAYS:'7',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
 c.name='crm-inmobiliario_crm-telecom-runtime'
 const binding=createPublicBuildBinding({...c.services['crm-telecom-staging'].environment,...env})
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:binding.public_sha256}
 const receipt={version:'staging.image.receipt.v1',...expected,image_config_digest:'sha256:'+'e'.repeat(64),manifest_digest:'sha256:'+'f'.repeat(64),image_reference:'ghcr.io/asier-comba/crm-telecom-staging@sha256:'+'f'.repeat(64),visibility:'private'}
 for(const s of Object.values(c.services)){s.image=receipt.image_reference;delete s.env_file;s.environment={...s.environment,...env};if(Array.isArray(s.networks))s.networks=Object.fromEntries(s.networks.map(n=>[n,null]));if(s.secrets)s.secrets=s.secrets.map(source=>({source,target:source}))}
 for(const n of ['crm-private','crm-outbound'])c.networks[n].name=c.name+'_'+n
 c.secrets['crm-staging-ingress']={name:c.name+'_crm-staging-ingress',file:'/etc/crm-telecom-runtime/ingress.json'}
 const policy={version:'product.staging.runtime.v1',status:'ACCEPTED',origin:'https://crm-telecom-staging.hvdnby.easypanel.host',auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false}
 const networks=['crm-private','crm-outbound'].map((n,i)=>({Id:(i?'b':'a').repeat(64),CreatedId:(i?'b':'a').repeat(64),Name:'crm-telecom-direct_'+n,Driver:'bridge',Scope:'local',Attachable:true,Internal:n==='crm-private',Options:i?{}:{'com.docker.network.bridge.gateway_mode_ipv4':'isolated'},Labels:{'crm.direct.owner':'crm-telecom-direct'}}))
 return {configuration:bindNetworkIds(directConfiguration(c),networks),receipt,expected,policy,binding,networks}
}
