const required=['owner','domain','organization','two-admins-mfa','region','billing','empty-staging-project','config-inventory','migrations','auth-policy','private-storage','scoped-server-identity','secret-bindings','smtp-provider-dns','network-ssl','retention-rpo-rto','database-restore','storage-restore','synthetic-acceptance','stage-approval','real-data-approval']
export function bootstrapContract(manifest) {
 const e=new Set(),fail=x=>e.add(x)
 if(manifest?.version!==1||manifest.status!=='UNPROVISIONED'||manifest.ownerDecision!==null||manifest.paths?.A===undefined||manifest.paths?.B===undefined)fail('BOOTSTRAP_SCHEMA')
 if(!Array.isArray(manifest?.steps))return ['BOOTSTRAP_STEPS']
 if(manifest.steps.length!==required.length||manifest.steps.some((s,i)=>s.id!==required[i]||!['HUMAN_APPROVAL','AUTOMATED_EVIDENCE'].includes(s.kind)||s.state!=='PENDING'||s.evidenceRef!==null))fail('BOOTSTRAP_STEPS')
 for(const p of manifest.providers||[])if(p.technicalAdminsTarget<2||p.mfaRequired!==true||p.environmentSeparation!==true||p.selectedProvider!==null||['businessOwnerRole','billingOwnerRole','recoveryOwnerRole'].some(k=>!p[k]))fail('PROVIDER_OWNERSHIP')
 if(manifest.providers?.length!==12||manifest.recovery?.databaseAndObjectsSeparate!==true||manifest.recovery?.keyCustodySeparateFromDestination!==true||manifest.recovery?.quarantineRetention!=='HUMAN_POLICY_REQUIRED')fail('BOOTSTRAP_RECOVERY')
 return [...e].sort()
}
// Offline adapter for sanitized read-only Management API snapshots. No credentials,
// provider response bodies or candidate policy approval are inferred from a diff.
const fields=['site_url','uri_allow_list','disable_signup','mailer_autoconfirm','jwt_exp','refresh_token_rotation_enabled','password_min_length','mailer_otp_exp','smtp_host','smtp_port','smtp_admin_email','smtp_sender_name']
export function configDrift(approved,snapshot) {
 if(approved?.status!=='HUMAN_APPROVED'||!approved.settings||!snapshot||typeof snapshot!=='object')return {result:'FAIL',errors:['APPROVED_MANIFEST_REQUIRED']}
 const missing=fields.filter(k=>!Object.hasOwn(approved.settings,k)||!Object.hasOwn(snapshot,k)),different=fields.filter(k=>Object.hasOwn(approved.settings,k)&&Object.hasOwn(snapshot,k)&&JSON.stringify(approved.settings[k])!==JSON.stringify(snapshot[k]))
 return {result:missing.length||different.length?'FAIL':'PASS',missingNames:missing,differingNames:different,scope:'OFFLINE_SETTINGS_DIFF_NOT_HOSTED_EXECUTION'}
}
