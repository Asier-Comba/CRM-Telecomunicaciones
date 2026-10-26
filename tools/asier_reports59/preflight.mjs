import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { preflight } from '../../scripts/platform/operations.mjs'
import { inventory } from '../../scripts/platform/inventory.mjs'

// Existing validator only, synthetic inputs, no process.env or remote service.
const synthetic = {PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',AUTH_EMAIL_ENABLED:'false',PRODUCT_V1_ENABLED:'true',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001'}
const cases = {
  missing_artifact:synthetic,
  synthetic_digest_is_not_approval:{...synthetic,APP_IMAGE_DIGEST:'sha256:'+'0'.repeat(64)},
  wildcard_cohort:{...synthetic,PRODUCT_STAGING_USER_IDS:'*'},
  production_target:{...synthetic,PLATFORM_TARGET:'PROD'},
}
const results=Object.entries(cases).map(([name,env])=>{
  const value=preflight(env.PLATFORM_TARGET,env)
  assert.equal(value.status,'BLOCKED')
  assert.equal(value.mutation_performed,false)
  assert.equal(value.checks.w4,'REQUIRED')
  assert.ok(value.errors.includes('HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED'))
  return {name,status:value.status,configuration_status:value.configuration_status,checks:value.checks,errors:value.errors,mutation_performed:value.mutation_performed}
})
const manifest=inventory()
const result={kind:'EXISTING_PREFLIGHT_SYNTHETIC_INPUTS_NOT_HOSTED_EVIDENCE',results,
  public_supabase_names:manifest.entries.filter(e=>e.name.startsWith('NEXT_PUBLIC_SUPABASE_')).map(({name,secret})=>({name,secret})),
  remote_values_observed:false,build_digest:null,published_image_manifest:null,hosted_health_observed:false,
  browser:'DENIED_ORIGIN_PRESERVED_OWNER_MUST_ALLOW_EXACT_SITE',team_protection:'UNCHANGED',
  release:'BLOCKED',w4:'PENDING',w5_191:'PENDING',
}
if(!process.argv[2])throw Error('OUTPUT_REQUIRED')
writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({cases:results.map(({name,status})=>({name,status})),release:result.release,remote_mutation:false}))
