export const origin='https://crm-telecom-staging-preview.netlify.app'
export const projectRef='zgwotxnyqzfuzcnmgvtn'
export const siteId='3d75b8b6-701d-4021-8c0e-fec141dbef6f'
export const customerName='Bilbao Telecom Demo SL'
export const prompt=`Factura para ${customerName} por instalación de fibra de 300 euros más el 21% de IVA y vencimiento en quince días`
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const ref=/^https:\/\/github\.com\/Asier-Comba\/CRM-Telecomunicaciones\/issues\/67#issuecomment-[0-9]+$/
const keys=['version','windowId','candidateSha','deploymentSourceSha','deployId','siteId','origin','projectRef','expiresAt','dataClassification','integratorReviewRef','cloudWindowRef','deploymentEvidenceRef','browserBinding','actorA','actorB']
const exact=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...allowed].sort().join(',')
/** Consumer input only. This does not create an approval, deployment, cohort or application gate. */
export function preflight(manifest,env=process.env,now=Date.now()){
 const codes=[]
 if(!exact(manifest,keys))return{ok:false,codes:['MANIFEST_MISSING_OR_INVALID']}
 if(manifest.version!==2||manifest.origin!==origin||manifest.projectRef!==projectRef||manifest.siteId!==siteId)codes.push('TARGET_BINDING_REFUSED')
 if(!/^[0-9a-f]{40}$/.test(manifest.candidateSha)||manifest.deploymentSourceSha!==manifest.candidateSha||!/^[a-z0-9-]{8,80}$/.test(manifest.deployId))codes.push('DEPLOYMENT_BINDING_REQUIRED')
 if(!uuid.test(manifest.windowId)||!Number.isFinite(Date.parse(manifest.expiresAt))||Date.parse(manifest.expiresAt)<=now)codes.push('APPROVED_WINDOW_REQUIRED')
 if(manifest.dataClassification!=='synthetic'||manifest.browserBinding!=='DEDICATED_W5_APPROVED_CONTEXT')codes.push('SYNTHETIC_DEDICATED_CONTEXT_REQUIRED')
 if(!ref.test(manifest.integratorReviewRef)||!ref.test(manifest.cloudWindowRef)||!ref.test(manifest.deploymentEvidenceRef))codes.push('EXACT_OWNER_HANDOFF_REFS_REQUIRED')
 const a=manifest.actorA,b=manifest.actorB
 if(!exact(a,['id','workspaceId','role','customerId'])||!exact(b,['id','workspaceId','role','customerId','invoiceId'])||![a?.id,a?.workspaceId,a?.customerId,b?.id,b?.workspaceId,b?.customerId,b?.invoiceId].every(v=>uuid.test(v))||a?.id===b?.id||a?.workspaceId===b?.workspaceId||a?.customerId===b?.customerId)codes.push('DISTINCT_SYNTHETIC_A_B_REQUIRED')
 if(!['owner','admin','member'].includes(a?.role)||!['owner','admin','member','viewer'].includes(b?.role))codes.push('EXPLICIT_ACTOR_ROLES_REQUIRED')
 if(env.OIER_CLOUD_QA_APPROVED_WRITES!=='true')codes.push('EXPLICIT_RUN_APPROVAL_REQUIRED')
 for(const actor of ['A','B']){
  if(!/^[^\s@]+@example\.invalid$/.test(env[`OIER_CLOUD_QA_${actor}_EMAIL`]??'')||typeof env[`OIER_CLOUD_QA_${actor}_PASSWORD`]!=='string'||env[`OIER_CLOUD_QA_${actor}_PASSWORD`].length<8)codes.push(`PRIVATE_${actor}_SIGNIN_REQUIRED`)
 }
 if(env.OIER_CLOUD_QA_A_EMAIL===env.OIER_CLOUD_QA_B_EMAIL)codes.push('DISTINCT_SIGNIN_REQUIRED')
 try{const u=new URL(env.OIER_CLOUD_QA_CDP_URL);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error()}catch{codes.push('PRIVATE_APPROVED_LOOPBACK_BROWSER_REQUIRED')}
 if(env.DEBUG||env.PWDEBUG)codes.push('PROTOCOL_DEBUG_MUST_BE_OFF')
 return{ok:codes.length===0,codes}
}
