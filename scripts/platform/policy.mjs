import { readFileSync } from 'node:fs'
export const contract = JSON.parse(readFileSync(new URL('../../platform/environment-contract.json', import.meta.url)))
export const inventory = JSON.parse(readFileSync(new URL('../../platform/secret-inventory.json', import.meta.url)))
const envs = ['LOCAL', 'DEV', 'STAGING', 'PROD']
export const secretNames = [...new Set(inventory.entries.map(e => e.name))]
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype
export function exactUrl(value, local = false) {
  if (typeof value !== 'string' || /[\s\\%*\x00-\x1f]/.test(value)) return null
  try {
    const u = new URL(value)
    if (u.username || u.password || u.hash || (local ? u.protocol !== 'http:' || u.hostname !== '127.0.0.1' : u.protocol !== 'https:')) return null
    return u
  } catch { return null }
}
export function validateContracts(c = contract, s = inventory) {
  const errors = new Set(), fail = x => errors.add(x)
  if (!plain(c) || c.version !== 1 || c.status !== 'CANDIDATE_UNAPPROVED' || !plain(c.environments)) return ['CONTRACT_SCHEMA']
  if (Object.keys(c.environments).sort().join() !== [...envs].sort().join()) fail('CONTRACT_ENVIRONMENTS')
  if (c.rules?.prodDemoEnabled !== false || c.rules?.prodMailTransport !== 'CUSTOM' || c.rules?.minNamedAdmins !== 2 || c.rules?.sharedMachineSecrets !== false || c.rules?.databaseRestoreIsStorageRestore !== false || c.rules?.realDataRequiresCompanyCutover !== true) fail('CONTRACT_INVARIANTS')
  for (const env of envs) {
    const resources = c.environments[env]?.resources
    if (!Array.isArray(resources) || resources.length < 20) { fail('RESOURCE_SCHEMA'); continue }
    const seen = new Set()
    for (const r of resources) {
      if (!plain(r) || !/^[A-Z][A-Z0-9_]+$/.test(r.name || '') || seen.has(r.name) || !['SECRET','PUBLIC'].includes(r.classification) || !['REQUIRED','OPTIONAL'].includes(r.requirement) || !['AUTOMATED','HUMAN_PROVISIONED'].includes(r.provisioning) || r.isolation !== 'ENVIRONMENT_UNIQUE' || typeof r.consumer !== 'string' || Object.keys(r).sort().join() !== ['name','classification','consumer','requirement','provisioning','isolation','clientExposureAllowed'].sort().join()) fail('RESOURCE_SCHEMA')
      seen.add(r.name)
      if (r.classification === 'SECRET' && r.clientExposureAllowed !== false) fail('SECRET_CLIENT_EXPOSURE')
    }
  }
  if (!plain(s) || s.version !== 1 || !Array.isArray(s.entries)) return [...errors, 'SECRET_SCHEMA']
  const seen = new Set()
  for (const e of s.entries) {
    const key = `${e.environment}:${e.name}`
    if (!plain(e) || seen.has(key) || !envs.includes(e.environment) || !/^[A-Z][A-Z0-9_]+$/.test(e.name || '') || e.clientExposureAllowed !== false || !['SERVER_SECRET','PLATFORM_SECRET'].includes(e.class) || ['ownerRole','consumer','rotationClass','revokeProcedureRef','recoveryCustodianRole'].some(k=>typeof e[k] !== 'string' || !e[k]) || Object.keys(e).sort().join() !== ['name','class','environment','ownerRole','consumer','rotationClass','revokeProcedureRef','recoveryCustodianRole','clientExposureAllowed'].sort().join()) fail('SECRET_SCHEMA')
    seen.add(key)
  }
  for (const env of envs) for (const r of c.environments[env]?.resources || []) if (r.classification === 'SECRET' && !seen.has(`${env}:${r.name}`)) fail('SECRET_INVENTORY_MISSING')
  return [...errors].sort()
}
export function validateEnvironment(target, cfg, runtime = {}) {
  const errors = new Set(validateContracts()), fail = x=>errors.add(x)
  if (!envs.includes(target) || !plain(cfg) || cfg.target !== target) return ['ENVIRONMENT_SCHEMA']
  if (Object.keys(cfg).some(k=>!['target','values','secretRefs','environmentBindings','ownership','demoEnabled','mailTransport','authPolicyApproved'].includes(k))) fail('UNKNOWN_CONFIG_FIELDS')
  const v = plain(cfg.values) ? cfg.values : {}, refs = plain(cfg.secretRefs) ? cfg.secretRefs : {}
  for (const name of Object.keys(runtime)) if (/^NEXT_PUBLIC_/.test(name) && /(SECRET|PASSWORD|SERVICE_ROLE|PRIVATE|ENCRYPTION|DATABASE|SMTP_USER|API_KEY|TOKEN)/.test(name)) fail('PUBLIC_SECRET_FORBIDDEN')
  const definitions = contract.environments[target].resources
  if (Object.keys(v).some(n=>!definitions.some(r=>r.name===n && r.classification==='PUBLIC')) || Object.keys(refs).some(n=>!secretNames.includes(n))) fail('UNKNOWN_CONFIG_NAMES')
  for (const r of definitions) {
    if (r.requirement !== 'REQUIRED') continue
    if (r.classification === 'SECRET') {
      if (typeof refs[r.name] !== 'string' || !refs[r.name].startsWith(`${target}/`) || !refs[r.name].endsWith(`/${r.name}`)) fail('SECRET_REFERENCE_REQUIRED')
      if (typeof runtime[r.name] !== 'string' || !runtime[r.name].trim()) fail('SECRET_PRESENCE_REQUIRED')
    } else if (typeof v[r.name] !== 'string' || !v[r.name].trim() || /[\x00-\x1f]/.test(v[r.name])) fail('REQUIRED_PUBLIC_CONFIGURATION')
  }
  const local = target==='LOCAL', app=exactUrl(v.PUBLIC_APP_URL,local), sb=exactUrl(v.SUPABASE_URL,local)
  if (!app || app.search || app.pathname !== '/' || !sb || sb.search || sb.pathname !== '/') fail('URL_POLICY')
  if (!local && sb && sb.hostname !== `${v.SUPABASE_PROJECT_REF}.supabase.co`) fail('PROJECT_URL_BINDING')
  let redirects; try { redirects=JSON.parse(v.AUTH_REDIRECT_URLS) } catch {}
  if (!Array.isArray(redirects) || !redirects.length || redirects.length>10 || new Set(redirects).size!==redirects.length || redirects.some(r=>!exactUrl(r,local) || !app || new URL(r).origin!==app.origin || new URL(r).pathname!=='/auth/callback' || new URL(r).search)) fail('REDIRECT_POLICY')
  let buckets; try { buckets=JSON.parse(v.STORAGE_BUCKETS) } catch {}
  if (!Array.isArray(buckets) || buckets.length!==contract.storageBuckets.length || [...buckets].sort().join()!==[...contract.storageBuckets].sort().join()) fail('STORAGE_POLICY')
  if (!local) {
    const o=cfg.ownership
    if (!plain(o) || o.companyOwnerApproved!==true || !Array.isArray(o.namedAdminRefs) || o.namedAdminRefs.length<2 || o.namedAdminRefs.some(x=>typeof x!=='string'||!x) || new Set(o.namedAdminRefs).size!==o.namedAdminRefs.length || o.mfaRequired!==true || ['billingOwnerRole','recoveryOwnerRole','backupOperatorRole','restoreApproverRole','securityReviewerRole','businessOwnerRole'].some(k=>typeof o[k]!=='string'||!o[k])) fail('OWNERSHIP_REQUIRED')
    if (o?.backupOperatorRole === o?.restoreApproverRole || o?.recoveryOwnerRole === o?.billingOwnerRole) fail('RECOVERY_SEPARATION')
    if (cfg.mailTransport!=='CUSTOM') fail('CUSTOM_SMTP_REQUIRED')
    if (!/^\d+$/.test(v.SMTP_PORT||'') || Number(v.SMTP_PORT)<1 || Number(v.SMTP_PORT)>65535 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v.SMTP_FROM||'')) fail('SMTP_CONFIGURATION')
    if (cfg.demoEnabled!==false) fail('DEMO_FORBIDDEN')
    if (cfg.authPolicyApproved!==true) fail('AUTH_HUMAN_APPROVAL_REQUIRED')
    const b=cfg.environmentBindings
    if (!plain(b) || ['DEV','STAGING','PROD'].some(e=>!plain(b[e]))) fail('ENVIRONMENT_BINDINGS_REQUIRED')
    else for (const name of definitions.filter(r=>r.requirement==='REQUIRED').map(r=>r.name)) {
      const ids=['DEV','STAGING','PROD'].map(e=>b[e][name])
      if (ids.some((id,i)=>typeof id!=='string'||!id.startsWith(`${['DEV','STAGING','PROD'][i]}/`)) || new Set(ids).size!==3) fail('ENVIRONMENT_SEPARATION')
      const expected = definitions.find(r=>r.name===name).classification==='SECRET' ? refs[name] : undefined
      if (expected && b[target][name]!==expected) fail('SECRET_BINDING_MISMATCH')
    }
  }
  const optionalOAuth = !!v.OAUTH_CLIENT_ID || !!refs.OAUTH_CLIENT_SECRET
  if (optionalOAuth && (!v.OAUTH_CLIENT_ID || !refs.OAUTH_CLIENT_SECRET?.startsWith(`${target}/`) || !runtime.OAUTH_CLIENT_SECRET)) fail('OAUTH_PAIR_REQUIRED')
  return [...errors].sort()
}
export function policyDiff() {
  return { environments:['DEV','STAGING','PROD'], output:'NAMES_ONLY', mustDiffer:contract.environments.PROD.resources.filter(r=>r.isolation==='ENVIRONMENT_UNIQUE').map(r=>r.name), evidence:'BINDING_REFERENCE_POLICY_ONLY_NOT_VAULT_VALUES' }
}
