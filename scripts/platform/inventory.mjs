import {readFileSync,writeFileSync} from 'node:fs'
import {join,relative} from 'node:path'
import {root,files,readJson,migrations,hash} from './lib.mjs'
export function inventory(){
 const prior=readJson('docs/master/contracts/product-environment.json').entries
 const uses=new Map(prior.map(e=>[e.name,['docs/master/contracts/product-environment.json']]))
 for(const file of [...files(join(root,'src')),...files(join(root,'scripts/platform'))].filter(p=>/\.(?:ts|tsx|mjs)$/.test(p))){
  const source=readFileSync(file,'utf8')
  for(const m of source.matchAll(/(?:process\.env|\benv)\.([A-Z][A-Z0-9_]+)/g))uses.set(m[1],[...new Set([...(uses.get(m[1])??[]),relative(root,file).replaceAll('\\','/')])])
 }
 for(const file of files(join(root,'infra')).filter(p=>/\.(?:yaml|template)$/.test(p))){
  for(const m of readFileSync(file,'utf8').matchAll(/\$\{([A-Z][A-Z0-9_]+)(?::[^}]*)?\}/g))uses.set(m[1],[...new Set([...(uses.get(m[1])??[]),relative(root,file).replaceAll('\\','/')])])
 }
 const extra={PLATFORM_TARGET:'enum',BACKUP_ENCRYPTION_KEY_HEX:'hex32',BACKUP_KEY_ID:'identifier',BACKUP_DESTINATION:'path',BACKUP_RETENTION_DAYS:'positive_integer',APP_IMAGE_DIGEST:'digest',APP_IMAGE:'image_digest',APP_ENV_FILE:'path',APP_HOST:'hostname',TLS_CERT_PATH:'path',TLS_KEY_PATH:'path',AUTH_SITE_URL:'origin',AUTH_REDIRECT_URLS:'json_urls',AUTH_EMAIL_ENABLED:'boolean',CRM_EMAIL_ENABLED:'boolean',CRM_EMAIL_ALLOWLIST:'json_emails',N8N_IMAGE:'image_digest',N8N_ENV_FILE:'path',N8N_DATABASE_PASSWORD_FILE:'path',N8N_ENCRYPTION_SECRET_FILE:'path',N8N_VOLUME_NAME:'identifier',N8N_ENABLED:'boolean',AI_ENABLED:'boolean',MONITORING_ENDPOINT:'https_url'}
 for(const name of Object.keys(extra))uses.set(name,[...new Set([...(uses.get(name)??[]),'scripts/platform'])])
 const publicNames=[...uses.keys()].filter(n=>n.startsWith('NEXT_PUBLIC_'))
 const required=new Set(['PLATFORM_TARGET','NEXT_PUBLIC_SUPABASE_URL','PRODUCT_V1_ORIGIN','NEXT_PUBLIC_APP_URL','AUTH_SITE_URL','AUTH_REDIRECT_URLS','AUTH_EMAIL_ENABLED','BACKUP_RETENTION_DAYS'])
 const entries=[...uses].sort(([a],[b])=>a.localeCompare(b)).map(([name,consumer])=>{
  const old=prior.find(e=>e.name===name)
  const secret=old?.secret??(!publicNames.includes(name)&&/(?:SECRET|PASSWORD|TOKEN|API_KEY|SERVICE_ROLE_KEY|KEY_HEX|TEST_KEY|DATABASE_URL|SMTP_USER)$/.test(name))
  let type=extra[name]??old?.validator??(name==='NODE_ENV'?'node_env':/(?:ENABLED|ENABLE_|FORCE_OFFLINE|LOCAL_INTEGRATION|LOCAL_SYNTHETIC|SCAN_REQUIRED)/.test(name)?'boolean':/(?:URL|ORIGIN|URI)$/.test(name)?'url':/(?:LIMIT|MAX_|TIMEOUT|_PORT)/.test(name)?'positive_integer':'string')
  return {name,type,secret,target:['LOCAL','DEV','STAGING','PROD'],required:{LOCAL:false,DEV:false,STAGING:required.has(name),PROD:required.has(name)},owner:name.startsWith('OPENAI')||name.startsWith('PLANNER')?'W3':'W5',consumer,validation_rule:type,description:old?.purpose??`Configuration binding for ${name}; presence does not prove provider readiness.`,rotation_expectation:secret?'Rotate on compromise and company policy; scoped per environment.':'Review on release/config change.',revocation_expectation:secret?'Company-approved provider-specific revoke and old-credential denial; no automatic live revocation.':'Revalidate and remove obsolete environment bindings.',health_test_reference:secret?'tests/platform/monitor.test.mjs rotation simulation; accepted provider-specific live test still required.':'scripts/platform/config.mjs read-only validation; presence is not provider readiness.',provider:old?.provider_class??'application',destination:secret?'environment-specific secret store':'environment-specific configuration',required_when:old?.required_when??null}
 })
 const fileSecrets={N8N_DATABASE_PASSWORD_FILE:{provider:'n8n_postgres',destination:'Private per-environment host secret file mounted read-only at /run/secrets/n8n_database_password'},N8N_ENCRYPTION_SECRET_FILE:{provider:'n8n',destination:'Private per-environment host secret file mounted read-only at /run/secrets/n8n_encryption_key'}}
 for(const entry of entries){
  if(fileSecrets[entry.name])Object.assign(entry,fileSecrets[entry.name],{file_content_secret:true,description:'Reference path only; file contents are private credentials, never included in public configuration/builds/logs. Company runtime remains disabled.'})
  if(entry.name==='IMPORT_STAGING_TEST_KEY'){entry.target=['LOCAL'];entry.destination='Ephemeral disposable local test process only; forbidden in hosted environments'}
 }
 return {version:2,values_included:false,environments:['LOCAL','DEV','STAGING','PROD'],entries,public_allowlist:publicNames,alternative_required_groups:[['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY']],config_artifacts:['supabase/config.toml','infra/platform/company.schema.json','infra/platform/providers.json'],migration_inventory:migrations()}
}
if(process.argv[1]?.endsWith('inventory.mjs')){
 const content=JSON.stringify(inventory(),null,2)+'\n',path=join(root,'infra/platform/environment-manifest.json')
 if(process.argv.includes('--check')){if(readFileSync(path,'utf8').replaceAll('\r\n','\n')!==content)throw new Error('ENV_INVENTORY_DRIFT')}
 else writeFileSync(path,content)
 console.log(JSON.stringify({manifest:'infra/platform/environment-manifest.json',sha256:hash(content),values_included:false}))
}
