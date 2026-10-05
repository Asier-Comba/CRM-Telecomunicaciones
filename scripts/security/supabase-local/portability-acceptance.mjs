import {readFileSync}from 'node:fs'
import {createHash}from 'node:crypto'
import {validateProductEnvironmentV1,mailProductionReadinessV1}from '../../../src/lib/server/product-environment-v1.ts'
export async function portabilityAcceptance({sql,check,http,url,anon,appUrl}){
 const manifest=JSON.parse(readFileSync('docs/master/contracts/product-environment.json','utf8')),config=readFileSync('supabase/config.toml','utf8')
 const validated=validateProductEnvironmentV1(manifest,{NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:appUrl,NODE_ENV:'test'},'TEST');check(validated.status==='valid','portability_real_runtime_binding_syntax')
 check(Number(sql(`select count(*)from storage.buckets where id='telecom-documents'and not public and file_size_limit=10485760 and allowed_mime_types @> array['application/pdf','image/png','image/jpeg']::text[] and cardinality(allowed_mime_types)=3`))===1,'portability_real_exact_private_document_bucket')
 check(Number(sql(`select count(*)from storage.buckets where id='telecom-import-quarantine'and not public and file_size_limit=10485760 and allowed_mime_types=array['application/zip']::text[]`))===1,'portability_real_quarantine_remains_private_zip_only_no_plaintext_upload')
 const settings=await http('/auth/v1/settings');check(settings.status===200&&settings.json?.external?.google===false,'portability_real_oauth_google_not_activated')
 const mail=mailProductionReadinessV1();check(mail.auth_mail.status==='not_configured'&&mail.crm_mail.status==='not_configured'&&mail.configured_flag_is_connection_proof===false,'portability_real_separate_mail_readiness_no_provider_claim')
 check(config.includes('enabled = false')&&config.includes('major_version = 15'),'portability_source_local_seed_off_pinned_DB_major')
 return{portability_environment_manifest:'PASS_VALUE_FREE_34_NAMES',portability_runtime_preflight:'PASS_SYNTAX_NOT_PROVIDER_HEALTH',portability_storage_config_drift:'PASS_EXACT_CURRENT_PRIVATE_BUCKETS',portability_auth_config:'PASS_LOCAL_OAUTH_OFF_PRODUCTION_CALLBACKS_UNVERIFIED',portability_config_sha256:createHash('sha256').update(config).digest('hex'),auth_email_readiness:'NOT_CONFIGURED_PRODUCTION_UNVERIFIED',crm_email_readiness:'NOT_CONFIGURED_SEPARATE_ADAPTER'}
}
