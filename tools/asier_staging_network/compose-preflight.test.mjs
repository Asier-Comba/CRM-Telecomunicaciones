import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join,relative} from 'node:path'
import {composePreflightV1,gatewayHealthProbe,composeDestination} from './compose-preflight.mjs'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
const require=createRequire(import.meta.url),yaml=require('js-yaml')
const project='crm-inmobiliario_crm-telecom-runtime'
const env={BACKUP_RETENTION_DAYS:'7',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
const policy={version:'product.staging.runtime.v1',status:'ACCEPTED',origin:'https://crm-telecom-staging.hvdnby.easypanel.host',auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false}
function fixture(){
 const configuration=yaml.load(readFileSync(new URL('./compose.proposed.yaml',import.meta.url),'utf8'))
 delete configuration['x-crm-runtime'];delete configuration['x-gateway-health'];configuration.name=project
 const binding=createPublicBuildBinding({...configuration.services['crm-telecom-staging'].environment,...env})
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:binding.public_sha256}
 const receipt={version:'staging.image.receipt.v1',...expected,image_config_digest:'sha256:'+'e'.repeat(64),manifest_digest:'sha256:'+'f'.repeat(64),image_reference:'ghcr.io/asier-comba/crm-telecom-staging@sha256:'+'f'.repeat(64),visibility:'private'}
 for(const service of Object.values(configuration.services)){
  service.image=receipt.image_reference;delete service.env_file;service.environment={...service.environment,...env}
  if(Array.isArray(service.networks))service.networks=Object.fromEntries(service.networks.map(name=>[name,null]))
  if(service.secrets)service.secrets=service.secrets.map(source=>({source,target:source}))
 }
 for(const [name,network]of Object.entries(configuration.networks))if(name!=='easypanel')network.name=project+'_'+name
 configuration.secrets['crm-staging-ingress']={name:project+'_crm-staging-ingress',file:'/etc/crm-telecom-runtime/ingress.json'}
 return {configuration,expected,receipt,policy:structuredClone(policy),binding}
}
const app=input=>input.configuration.services['crm-telecom-staging']
const ingress=input=>input.configuration.services['crm-telecom-ingress']
const egress=input=>input.configuration.services['crm-telecom-egress']
test('resolved declarative configuration binds exact private manifest receipt and never grants authority',()=>{
 const input=fixture(),report=composePreflightV1(input)
 assert.equal(report.status,'CONFIGURATION_CHECKED',JSON.stringify(report.errors));assert.deepEqual(report.errors,[])
 assert.deepEqual(report.destination,composeDestination);assert.equal(report.image_reference,input.receipt.image_reference)
 for(const field of ['publishing_authorized','deploying_authorized','external_evidence_verified','mutation_performed','values_included'])assert.equal(report[field],false)
 assert.equal(report.hosted_acceptance,'NOT_RUN');assert.equal(ingress(input).healthcheck.test[3],gatewayHealthProbe)
 const before=JSON.stringify(input);composePreflightV1(input);assert.equal(JSON.stringify(input),before)
 const normalized=structuredClone(input);for(const service of Object.values(normalized.configuration.services)){service.mem_limit=service.mem_limit==='768m'?805306368:268435456;service.cpus=String(service.cpus)}
 assert.equal(composePreflightV1(normalized).status,'CONFIGURATION_CHECKED')
})
const mutations={
 missingReceipt:i=>{delete i.receipt},
 mutableTag:i=>{app(i).image='ghcr.io/asier-comba/crm-telecom-staging:latest'},
 automaticPull:i=>{egress(i).pull_policy='always'},
 otherRoleImage:i=>{egress(i).image=i.receipt.image_reference.replace(/f$/,'e')},
 configIdForManifest:i=>{i.receipt.manifest_digest=i.receipt.image_config_digest;i.receipt.image_reference='ghcr.io/asier-comba/crm-telecom-staging@'+i.receipt.manifest_digest},
 sourceDrift:i=>{i.expected.source='0'.repeat(40)},
 publicPackage:i=>{i.receipt.visibility='public'},
 wrongPublicFingerprint:i=>{i.receipt.public_build_sha256=i.expected.public_build_sha256='0'.repeat(64)},
 unreviewedPolicy:i=>{i.policy.reviews.w4='PENDING'},
 otherProject:i=>{i.configuration.name='other-app'},
 missingProject:i=>{delete i.configuration.name},
 missingOwnedNetworkName:i=>{delete i.configuration.networks['crm-private'].name},
 additionalService:i=>{i.configuration.services.other=structuredClone(app(i))},
 publicPort:i=>{app(i).ports=[{target:3000,published:'3000'}]},
 socketMount:i=>{egress(i).volumes=[{source:'/var/run/docker.sock',target:'/var/run/docker.sock',type:'bind'}]},
 hostNetwork:i=>{app(i).network_mode='host'},
 foreignNetwork:i=>{app(i).networks.easypanel=null},
 internetOnApp:i=>{app(i).networks['crm-outbound']=null},
 egressOnShared:i=>{egress(i).networks.easypanel=null},
 privateNotInternal:i=>{i.configuration.networks['crm-private'].internal=false},
 privateStringFalse:i=>{i.configuration.networks['crm-private'].internal='false'},
 privateStringTrue:i=>{i.configuration.networks['crm-private'].internal='true'},
 privateNumericTrue:i=>{i.configuration.networks['crm-private'].internal=1},
 outboundNumericFalse:i=>{i.configuration.networks['crm-outbound'].internal=0},
 privateExternal:i=>{i.configuration.networks['crm-private'].external=true},
 foreignNamedPrivate:i=>{i.configuration.networks['crm-private'].name='easypanel'},
 externalChanged:i=>{i.configuration.networks.easypanel.name='foreign'},
 extraIpam:i=>{i.configuration.networks['crm-private'].ipam={driver:'default'}},
 networkAliasInjection:i=>{app(i).networks['crm-private'].aliases.push('foreign')},
 rawDns:i=>{app(i).dns=['8.8.8.8']},
 dnsRemoved:i=>{delete app(i).dns},
 extraHosts:i=>{app(i).extra_hosts=['supabase:127.0.0.1']},
 secretOnApp:i=>{app(i).secrets=structuredClone(ingress(i).secrets)},
 secretOnEgress:i=>{egress(i).secrets=structuredClone(ingress(i).secrets)},
 secretMountTarget:i=>{ingress(i).secrets[0].target='other'},
 secretHostPath:i=>{i.configuration.secrets['crm-staging-ingress'].file='/etc/foreign/password'},
 inlineSecret:i=>{i.configuration.secrets['crm-staging-ingress']={environment:'PASSWORD'}},
 alternateEntrypoint:i=>{ingress(i).entrypoint=['sh']},
 emptyEntrypoint:i=>{app(i).entrypoint=[]},
 emptyCommand:i=>{app(i).command=[]},
 alternateCommand:i=>{egress(i).command=['other.mjs']},
 appCommand:i=>{app(i).command=['server.js']},
 rootUser:i=>{app(i).user='0:0'},
 writableRoot:i=>{egress(i).read_only=false},
 elevatedCapabilities:i=>{app(i).cap_add=['NET_ADMIN']},
 noPrivilegeGuard:i=>{delete ingress(i).security_opt},
 unlimitedMemory:i=>{delete app(i).mem_limit},
 largerCpu:i=>{egress(i).cpus=2},
 alternateTmpfs:i=>{app(i).tmpfs.push('/etc')},
 unboundedRestart:i=>{app(i).restart='always'},
 increasedShutdown:i=>{ingress(i).stop_grace_period='5m'},
 unboundedLogs:i=>{delete app(i).logging.options['max-size']},
 externalHealth:i=>{ingress(i).healthcheck.test[3]='fetch("https://other.invalid")'},
 disabledHealth:i=>{ingress(i).healthcheck.disable=true},
 appHealthOverride:i=>{app(i).healthcheck={disable:true}},
 enabledDocuments:i=>{for(const s of Object.values(i.configuration.services))s.environment.PRODUCT_DOCUMENT_LIBRARY_ENABLED='true'},
 nodeOptions:i=>{app(i).environment.NODE_OPTIONS='--require=/tmp/other.js'},
 roleCohortMismatch:i=>{ingress(i).environment.PRODUCT_STAGING_USER_IDS='20000000-0000-4000-8000-000000000002'},
 envFileUnresolved:i=>{app(i).env_file='/etc/crm-telecom-runtime/runtime.env'},
 extraTopLevel:i=>{i.configuration.include=['other.yml']}
}
for(const [name,mutate]of Object.entries(mutations))test('closed preflight rejects '+name,()=>{
 const input=fixture();mutate(input);const report=composePreflightV1(input)
 assert.equal(report.status,'BLOCKED');assert.ok(report.errors.length>0);assert.equal(report.deploying_authorized,false)
})
test('missing/malformed input blocks without exposing configuration or credential-bearing fields',()=>{
 for(const configuration of [undefined,null,[],{},'synthetic-private-value']){
  const report=composePreflightV1({configuration});assert.equal(report.status,'BLOCKED');assert.equal(JSON.stringify(report).includes('synthetic-private-value'),false)
 }
 const input=fixture();app(input).environment.SUPABASE_SERVICE_ROLE_KEY='synthetic-private-value';const report=composePreflightV1(input)
 assert.equal(report.status,'BLOCKED');assert.equal(JSON.stringify(report).includes('synthetic-private-value'),false)
})

test('only documented null defaults, empty IPAM and known nonexecuting extensions preserve the resolved model',()=>{
 const input=fixture()
 input.configuration['x-crm-runtime']={image:'ignored-extension-only'};input.configuration['x-gateway-health']={test:['ignored-extension-only']}
 for(const service of Object.values(input.configuration.services))service.entrypoint=null
 app(input).command=null
 for(const network of Object.values(input.configuration.networks))network.ipam={}
 assert.equal(composePreflightV1(input).status,'CONFIGURATION_CHECKED')
 for(const field of ['entrypoint','command']){
  const changed=structuredClone(input);app(changed)[field]=[]
  assert.equal(composePreflightV1(changed).status,'BLOCKED')
 }
 const changed=structuredClone(input);changed.configuration.networks['crm-private'].ipam={config:[{subnet:'10.0.0.0/8'}]}
 assert.equal(composePreflightV1(changed).status,'BLOCKED')
})

test('actual Actions Compose parser resolves the proposal before the same closed checks; no engine or containers',{skip:process.env.GITHUB_ACTIONS!=='true'},()=>{
 const input=fixture(),directory=mkdtempSync(join(tmpdir(),'crm-compose-parser-'))
 try{
  const synthetic={...app(input).environment};delete synthetic.HOSTNAME;delete synthetic.PORT
  const environmentFile=join(directory,'synthetic.env')
  writeFileSync(environmentFile,Object.entries(synthetic).map(([name,value])=>name+'='+value).join('\n')+'\n',{mode:0o600})
  // `config` parses only. Closed environment: no inherited registry auth, selectors or credentials.
  const result=spawnSync('docker',['compose','--project-name',project,'--file','tools/asier_staging_network/compose.proposed.yaml','config','--format','json'],{
   env:{PATH:process.env.PATH,HOME:directory,APP_IMAGE:input.receipt.image_reference,APP_ENV_FILE:environmentFile,CRM_INGRESS_CREDENTIAL_FILE:'/etc/crm-telecom-runtime/ingress.json'},
   encoding:'utf8',timeout:10000,maxBuffer:1024*1024,shell:false
  })
  assert.equal(result.status,0,'ACTUAL_COMPOSE_PARSE_FAILED')
  input.configuration=JSON.parse(result.stdout)
  const report=composePreflightV1(input)
  // Safe observation of real parser normalization. Never dump resolved environment/file values.
  const structure={root:Object.keys(input.configuration),services:Object.fromEntries(Object.entries(input.configuration.services??{}).map(([name,service])=>[name,Object.keys(service)])),networks:Object.fromEntries(Object.entries(input.configuration.networks??{}).map(([name,network])=>[name,Object.fromEntries(Object.entries(network).map(([field,value])=>[field,typeof value]))]))}
  assert.equal(report.status,'CONFIGURATION_CHECKED',JSON.stringify({errors:report.errors,structure}))
  assert.equal(report.hosted_acceptance,'NOT_RUN');assert.equal(report.deploying_authorized,false)
 }finally{
  assert.match(relative(tmpdir(),directory),/^crm-compose-parser-[^/\\]+$/)
  rmSync(directory,{recursive:true,force:true})
 }
})
