import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {verify} from 'node:crypto'
import {root,hash} from './lib.mjs'

export function verifyLockedSbom(bom,lock){
 const expected=new Map(Object.entries(lock.packages).filter(([p])=>p)),actual=new Map()
 for(const component of bom.components){const path=component.properties?.find(p=>p.name==='cdx:npm:package:path')?.value;if(!path||actual.has(path))throw new Error('SBOM_PACKAGE_PATH_INVALID');actual.set(path,component)}
 if(expected.size!==actual.size)throw new Error('SBOM_PACKAGE_INVENTORY_DRIFT')
 for(const [path,pkg]of expected){const c=actual.get(path),name=pkg.name??path.split('node_modules/').at(-1);if(!c||c.version!==pkg.version||c.name!==name)throw new Error('SBOM_PACKAGE_IDENTITY_DRIFT')}
 return {status:'PASS',components:actual.size}
}

export function normalizeSbom(bom,packageName,lockDigest){
 const copy=structuredClone(bom);delete copy.serialNumber;delete copy.metadata.timestamp
 copy.metadata.component.name=packageName
 copy.metadata.properties=[{name:'crm:package-lock:sha256',value:lockDigest},{name:'crm:scope',value:'locked-development-optional-runtime; not installed container inventory'}]
 copy.components.sort((a,b)=>a['bom-ref'].localeCompare(b['bom-ref']))
 copy.dependencies.sort((a,b)=>a.ref.localeCompare(b.ref));for(const d of copy.dependencies)d.dependsOn?.sort()
 return copy
}
export function attestationContract({scope,payload,signature,publicKey,expected}){
 if(scope!=='DISPOSABLE_SIMULATION')throw new Error('HOSTED_RELEASE_NOT_AUTHORIZED')
 const errors=[]
 if(typeof payload!=='string'||Buffer.byteLength(payload)>65536)throw new Error('ATTESTATION_SIZE_INVALID')
 let document;try{document=JSON.parse(payload)}catch{throw new Error('ATTESTATION_JSON_INVALID')}
 try{if(!verify(null,Buffer.from(payload),publicKey,Buffer.from(signature??'','base64')))errors.push('ATTESTATION_SIGNATURE_INVALID')}catch{errors.push('ATTESTATION_SIGNATURE_INVALID')}
 for(const field of ['source_sha','image_digest','sbom_digest','migration_digest','config_digest','target','project_ref','organization'])if(document[field]!==expected?.[field]||!document[field])errors.push(`${field.toUpperCase()}_MISMATCH`)
 if(!/^[a-f0-9]{40}$/.test(document.source_sha??'')||!['image_digest','sbom_digest','migration_digest','config_digest'].every(f=>/^sha256:[a-f0-9]{64}$/.test(document[f]??'')))errors.push('IMMUTABLE_IDENTITY_REQUIRED')
 if(document.account_class!=='COMPANY'||document.human_admins<2||document.mfa!==true)errors.push('COMPANY_OWNERSHIP_REQUIRED')
 for(const check of ['node','native_postgres','supabase','container','secret_scan','image_scan','w2_browser','dns','tls','smtp','backup','restore','configuration'])if(document.checks?.[check]!=='PASS')errors.push(`${check.toUpperCase()}_PROOF_REQUIRED`)
 if(document.checks?.dependency_audit!=='PASS')errors.push('DEPENDENCY_AUDIT_REQUIRED')
 if(document.worker_enabled!==false&&document.checks?.w3_worker!=='PASS')errors.push('ACCEPTED_W3_WORKER_REQUIRED')
 if(document.w4?.result!=='APPROVED'||document.w4.source_sha!==document.source_sha)errors.push('EXACT_W4_REVIEW_REQUIRED')
 if(document.approval?.result!=='APPROVED'||document.approval.target!==document.target||document.approval.source_sha!==document.source_sha)errors.push('PROTECTED_HUMAN_APPROVAL_REQUIRED')
 if(document.target==='PROD'&&(document.staging?.source_sha!==document.source_sha||document.staging?.image_digest!==document.image_digest||document.staging?.result!=='PASS'))errors.push('EXACT_STAGING_ARTIFACT_REQUIRED')
 return {status:errors.length?'BLOCKED':'SIMULATED_CONTRACT_PASS',errors,signature_scope:'INJECTED_TEST_TRUST_ANCHOR',hosted_release_authorized:false,provider_values_included:false}
}
if(process.argv[1]?.endsWith('supply-chain.mjs')){
 const path=join(root,'infra/deployment/sbom.cyclonedx.json'),bom=JSON.parse(readFileSync(path)),name=JSON.parse(readFileSync(join(root,'package.json'))).name
 verifyLockedSbom(bom,JSON.parse(readFileSync(join(root,'package-lock.json'))))
 const normalized=JSON.stringify(normalizeSbom(bom,name,hash(readFileSync(join(root,'package-lock.json'),'utf8').replaceAll('\r\n','\n'))),null,2)+'\n'
 if(process.argv.includes('--check')){if(normalized!==readFileSync(path,'utf8').replaceAll('\r\n','\n'))throw new Error('SBOM_NORMALIZATION_DRIFT')}
 else writeFileSync(path,normalized)
 console.log(JSON.stringify({status:'PASS',scope:'LOCKED_SBOM_NORMALIZATION',sha256:hash(normalized),components:bom.components.length,container_inventory_proven:false}))
}
