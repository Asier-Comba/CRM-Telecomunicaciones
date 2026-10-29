import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync,symlinkSync,linkSync,realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
import {manualPreflightV1} from './manual-preflight.mjs'
const require=createRequire(import.meta.url),yaml=require('js-yaml')
const cli=fileURLToPath(new URL('./manual-preflight.mjs',import.meta.url))
const names=['configuration','receipt','expected','policy','binding']
const flags=['--compose','--receipt','--expected','--policy','--binding']
function fixture(){
 const directory=mkdtempSync(join(realpathSync(tmpdir()),'crm-manual-preflight-'))
 const configuration=yaml.load(readFileSync(new URL('./compose.proposed.yaml',import.meta.url),'utf8'))
 delete configuration['x-crm-runtime'];delete configuration['x-gateway-health'];configuration.name='crm-inmobiliario_crm-telecom-runtime'
 const extra={BACKUP_RETENTION_DAYS:'7',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
 const binding=createPublicBuildBinding({...configuration.services['crm-telecom-staging'].environment,...extra})
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:binding.public_sha256}
 const receipt={version:'staging.image.receipt.v1',...expected,image_config_digest:'sha256:'+'e'.repeat(64),manifest_digest:'sha256:'+'f'.repeat(64),image_reference:'ghcr.io/asier-comba/crm-telecom-staging@sha256:'+'f'.repeat(64),visibility:'private'}
 // Synthetic policy only. This never changes the tracked PROPOSED image policy.
 const policy={version:'product.staging.runtime.v1',status:'ACCEPTED',origin:'https://crm-telecom-staging.hvdnby.easypanel.host',auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false}
 for(const service of Object.values(configuration.services)){
  service.image=receipt.image_reference;delete service.env_file;service.environment={...service.environment,...extra}
  if(Array.isArray(service.networks))service.networks=Object.fromEntries(service.networks.map(name=>[name,null]))
  if(service.secrets)service.secrets=service.secrets.map(source=>({source,target:'/run/secrets/'+source}))
 }
 for(const [name,network]of Object.entries(configuration.networks))if(name!=='easypanel')network.name=configuration.name+'_'+name
 configuration.secrets['crm-staging-ingress']={file:'/etc/crm-telecom-runtime/ingress.json'}
 const values={configuration,receipt,expected,policy,binding}
 const paths=Object.fromEntries(names.map(name=>[name,join(directory,name+'.json')]))
 const save=()=>{for(const name of names)writeFileSync(paths[name],JSON.stringify(values[name]),{mode:0o600})}
 save()
 return {directory,values,paths,save,args:flags.flatMap((flag,n)=>[flag,paths[names[n]]]),cleanup:()=>rmSync(directory,{recursive:true,force:true})}
}
test('CLI reads all five real JSON files and outputs hashes without values, mutations or deployment authority',()=>{
 const f=fixture()
 try{
  const before=names.map(name=>readFileSync(f.paths[name],'utf8'))
  const r=spawnSync(process.execPath,['--experimental-transform-types',cli,...f.args],{encoding:'utf8',timeout:10000,shell:false})
  assert.equal(r.status,0,r.stdout);const report=JSON.parse(r.stdout)
  assert.equal(report.status,'CONFIGURATION_CHECKED');assert.deepEqual(Object.keys(report.input_sha256).sort(),[...names].sort())
  assert.equal(report.source_evidence,'NOT_AUTHENTICATED');assert.equal(report.effective_plan_status,'EFFECTIVE_PLAN_UNVERIFIED')
  for(const field of ['values_included','mutation_performed','publishing_authorized','deploying_authorized','external_evidence_verified'])assert.equal(report[field],false)
  for(const value of [f.directory,f.values.configuration.services['crm-telecom-staging'].environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,extraCohort])assert.equal(r.stdout.includes(value),false)
  assert.deepEqual(names.map(name=>readFileSync(f.paths[name],'utf8')),before)
 }finally{f.cleanup()}
})
const extraCohort='10000000-0000-4000-8000-000000000001'
test('tracked PROPOSED policy remains blocked through the actual CLI adapter',()=>{
 const f=fixture();try{f.values.policy=JSON.parse(readFileSync('infra/platform/product-staging-runtime-policy.json','utf8'));f.save();const r=manualPreflightV1(f.args);assert.equal(r.status,'BLOCKED');assert.ok(r.errors.includes('SERVICE_RUNTIME_ADMISSION_DENIED'));assert.equal(r.deploying_authorized,false)}finally{f.cleanup()}
})
test('tag drift, missing review, enabled capability and wrong resource/project remain blocked',()=>{
 for(const kind of ['tag','review','capability','resource','project']){
  const f=fixture();try{
   if(kind==='tag')f.values.configuration.services['crm-telecom-staging'].image='ghcr.io/asier-comba/crm-telecom-staging:latest'
   if(kind==='review')f.values.policy.reviews.w4='PENDING'
   if(kind==='capability')f.values.configuration.services['crm-telecom-ingress'].environment.PRODUCT_DOCUMENT_CONTENT_ENABLED='true'
   if(kind==='resource')f.values.configuration.services['crm-telecom-egress'].cpus=[0.25]
   if(kind==='project')delete f.values.configuration.name
   f.save();assert.equal(manualPreflightV1(f.args).status,'BLOCKED')
  }finally{f.cleanup()}
 }
})
test('unknown, duplicate, missing and empty flags reject before input access',()=>{
 const f=fixture();try{for(const args of [[],f.args.slice(0,-2),['--apply','private-marker',...f.args.slice(2)],['--compose',f.paths.configuration,...f.args.slice(0,-2)],['--compose','',...f.args.slice(2)]]){const r=manualPreflightV1(args);assert.deepEqual(r.errors,['MANUAL_ARGUMENTS_INVALID']);assert.equal(JSON.stringify(r).includes('private-marker'),false)}}finally{f.cleanup()}
})
test('missing files, directories, malformed JSON and oversized inputs fail safely without leaking paths/content',()=>{
 for(const kind of ['missing','directory','json','oversize']){
  const f=fixture();try{
   if(kind==='missing')rmSync(f.paths.binding)
   if(kind==='directory'){rmSync(f.paths.binding);mkdirSync(f.paths.binding)}
   if(kind==='json')writeFileSync(f.paths.binding,'private-secret-marker malformed')
   if(kind==='oversize')writeFileSync(f.paths.binding,'x'.repeat(16*1024+1))
   const report=manualPreflightV1(f.args);assert.equal(report.status,'BLOCKED');assert.equal(JSON.stringify(report).includes(f.directory),false);assert.equal(JSON.stringify(report).includes('private-secret-marker'),false)
  }finally{f.cleanup()}
 }
})
test('hard-linked input is rejected before parsing',()=>{
 const f=fixture();try{linkSync(f.paths.binding,join(f.directory,'alias.json'));assert.deepEqual(manualPreflightV1(f.args).errors,['MANUAL_INPUT_FILE_INVALID'])}finally{f.cleanup()}
})
test('symlink input is rejected, never followed',t=>{
 const f=fixture();try{const target=join(f.directory,'target.json');writeFileSync(target,JSON.stringify(f.values.binding));rmSync(f.paths.binding);try{symlinkSync(target,f.paths.binding)}catch(error){if(process.platform==='win32'&&error.code==='EPERM'){t.skip('Windows symlink privilege unavailable; Linux CI must execute this negative');return}throw error}assert.deepEqual(manualPreflightV1(f.args).errors,['MANUAL_INPUT_FILE_INVALID'])}finally{f.cleanup()}
})
test('actual CLI blocks missing input with nonzero exit and no raw exception or path',()=>{
 const r=spawnSync(process.execPath,['--experimental-transform-types',cli],{encoding:'utf8',timeout:10000,shell:false})
 assert.equal(r.status,2);assert.deepEqual(JSON.parse(r.stdout).errors,['MANUAL_ARGUMENTS_INVALID'])
})

test('manual contract keeps exact Compose roles, network attachments, resource caps and closed authority',()=>{
 const contract=JSON.parse(readFileSync(new URL('./manual-deployment-contract.json',import.meta.url),'utf8'))
 const spec=yaml.load(readFileSync(new URL('./compose.proposed.yaml',import.meta.url),'utf8'))
 assert.equal(contract.target.project,'crm-inmobiliario');assert.equal(contract.target.type,'compose');assert.equal(contract.target.service,'crm-telecom-runtime')
 assert.equal(contract.target.compose_project,'crm-inmobiliario_crm-telecom-runtime')
 for(const [role,name]of [['application','crm-telecom-staging'],['ingress','crm-telecom-ingress'],['egress','crm-telecom-egress']]){
  const service=spec.services[name]
  assert.equal(service.image,spec['x-crm-runtime'].image);assert.equal(service.pull_policy,contract.source.pull_policy)
  assert.equal(service.mem_limit,contract.resources[role].memory_mib+'m');assert.equal(service.cpus,contract.resources[role].cpu)
  assert.deepEqual(Array.isArray(service.networks)?service.networks:Object.keys(service.networks),contract.networks[role])
 }
 const total=['application','ingress','egress'].reduce((a,role)=>({memory:a.memory+contract.resources[role].memory_mib,cpu:a.cpu+contract.resources[role].cpu}),{memory:0,cpu:0})
 assert.equal(total.memory,contract.resources.total_memory_mib);assert.equal(total.cpu,contract.resources.total_cpu)
 for(const field of ['request_implement_now','release_accepted','deploying_authorized'])assert.equal(contract.authority[field],false)
 assert.equal(contract.preflight.deploying_authorized,false)
 assert.equal(contract.networks.host_ports_allowed,false);assert.equal(contract.rollback.destroy_or_global_prune,false)
})
