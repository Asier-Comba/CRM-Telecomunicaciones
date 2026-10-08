import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {root,hash,migrations,run,readJson} from './lib.mjs'
const paths=['supabase/config.toml','infra/platform/environment-manifest.json','infra/platform/providers.json','infra/platform/worker-contract.json','infra/n8n/registry.json','infra/n8n/synthetic-health.json','infra/n8n/compose.preparatory.yaml','infra/n8n/disposable-image-pins.json','infra/deployment/Dockerfile','infra/deployment/compose.yaml','infra/deployment/nginx.conf.template']
export function recoveryManifest(){
 return {version:1,scope:'LOCAL_CANONICAL_PUBLIC_CONFIG_ONLY',source_sha:run('git',['rev-parse','HEAD']).trim(),package_lock_sha256:hash(readFileSync(join(root,'package-lock.json'),'utf8').replaceAll('\r\n','\n')),migrations:migrations(),configuration:paths.map(path=>{const bytes=Buffer.from(readFileSync(join(root,path),'utf8').replaceAll('\r\n','\n'));return {path,sha256:hash(bytes),bytes:bytes.toString('base64')}}),secret_references:readJson('infra/platform/environment-manifest.json').entries.filter(e=>e.secret||e.file_content_secret===true).map(e=>({name:e.name,destination:e.destination,owner:e.owner})),workflow_activation:'DISABLED',private_secret_values_included:false,company_runtime_configuration:'NOT_CAPTURED'}
}
export function verifyRecoveryManifest(actual,expected){
 if(actual?.version!==1||actual.scope!==expected.scope||actual.source_sha!==expected.source_sha||actual.package_lock_sha256!==expected.package_lock_sha256)throw new Error('RECOVERY_SOFTWARE_BINDING_DRIFT')
 if(JSON.stringify(actual.migrations)!==JSON.stringify(expected.migrations))throw new Error('RECOVERY_MIGRATION_INVENTORY_DRIFT')
 if(!Array.isArray(actual.configuration)||actual.configuration.length!==expected.configuration.length)throw new Error('RECOVERY_CONFIGURATION_INVENTORY_DRIFT')
 for(let i=0;i<expected.configuration.length;i++){
  const a=actual.configuration[i],e=expected.configuration[i]
  if(!a||a.path!==e.path||a.sha256!==e.sha256||typeof a.bytes!=='string'||hash(Buffer.from(a.bytes,'base64'))!==e.sha256)throw new Error('RECOVERY_CONFIGURATION_BYTES_DRIFT')
 }
 if(JSON.stringify(actual.secret_references)!==JSON.stringify(expected.secret_references)||actual.workflow_activation!=='DISABLED'||actual.private_secret_values_included!==false||actual.company_runtime_configuration!=='NOT_CAPTURED')throw new Error('RECOVERY_SECRET_WORKFLOW_DRIFT')
 return {status:'PASS',configuration_files:actual.configuration.length,secret_references:actual.secret_references.length,private_values_included:false,scope:actual.scope}
}
