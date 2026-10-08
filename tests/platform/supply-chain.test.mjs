import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync,sign} from 'node:crypto'
import {attestationContract,normalizeSbom,verifyLockedSbom} from '../../scripts/platform/supply-chain.mjs'
import {readJson} from '../../scripts/platform/lib.mjs'
const sha='a'.repeat(40),digest='sha256:'+'b'.repeat(64),expected={source_sha:sha,image_digest:digest,sbom_digest:digest,migration_digest:digest,config_digest:digest,target:'PROD',project_ref:'synthetic-project',organization:'synthetic-company'}
const document=()=>({...expected,account_class:'COMPANY',human_admins:2,mfa:true,worker_enabled:false,checks:Object.fromEntries(['node','native_postgres','supabase','container','secret_scan','image_scan','w2_browser','dns','tls','smtp','backup','restore','configuration','dependency_audit'].map(k=>[k,'PASS'])),w4:{result:'APPROVED',source_sha:sha},approval:{result:'APPROVED',target:'PROD',source_sha:sha},staging:{result:'PASS',source_sha:sha,image_digest:digest}})
test('cryptographic attestation binds exact artifacts while remaining a simulation',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),payload=JSON.stringify(document()),signature=sign(null,Buffer.from(payload),privateKey).toString('base64')
 const r=attestationContract({scope:'DISPOSABLE_SIMULATION',payload,signature,publicKey,expected});assert.equal(r.status,'SIMULATED_CONTRACT_PASS');assert.equal(r.hosted_release_authorized,false)
 assert.equal(attestationContract({scope:'DISPOSABLE_SIMULATION',payload:payload+' ',signature,publicKey,expected}).status,'BLOCKED')
 assert.equal(attestationContract({scope:'DISPOSABLE_SIMULATION',payload,signature,publicKey:generateKeyPairSync('ed25519').publicKey,expected}).status,'BLOCKED')
})
test('signed negative release matrix rejects wrong identities and unaccepted/skipped proofs',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519')
 const mutations=[d=>d.source_sha='c'.repeat(40),d=>d.image_digest='latest',d=>d.project_ref='wrong',d=>d.account_class='PERSONAL',d=>d.human_admins=1,d=>d.mfa=false,d=>d.checks.dns='MISSING',d=>d.checks.tls='FAIL',d=>d.checks.smtp='MISSING',d=>d.checks.backup='FAIL',d=>d.checks.restore='SKIPPED',d=>d.migration_digest='sha256:'+'c'.repeat(64),d=>d.checks.w2_browser='FAIL',d=>d.worker_enabled=true,d=>d.w4.result='PENDING',d=>d.checks.dependency_audit='FAIL',d=>d.approval.result='MISSING',d=>d.staging.image_digest='sha256:'+'c'.repeat(64)]
 for(const mutation of mutations){const d=document();mutation(d);const payload=JSON.stringify(d),signature=sign(null,Buffer.from(payload),privateKey).toString('base64');assert.equal(attestationContract({scope:'DISPOSABLE_SIMULATION',payload,signature,publicKey,expected}).status,'BLOCKED')}
})
test('SBOM normalization removes volatile identity/time and orders components and dependencies',()=>{
 const b={serialNumber:'random',metadata:{timestamp:'now',component:{name:'folder'}},components:[{'bom-ref':'z'},{'bom-ref':'a'}],dependencies:[{ref:'z',dependsOn:['z','a']},{ref:'a',dependsOn:[]}]}
 const first=normalizeSbom(b,'package','a'.repeat(64));assert.deepEqual(normalizeSbom(first,'package','a'.repeat(64)),first);assert.equal(first.serialNumber,undefined);assert.equal(first.metadata.timestamp,undefined);assert.equal(first.components[0]['bom-ref'],'a')
})
test('full checked-in SBOM matches every locked package path/version; stale/missing packages fail',()=>{
 const bom=readJson('infra/deployment/sbom.cyclonedx.json'),lock=readJson('package-lock.json');assert.equal(verifyLockedSbom(bom,lock).components,497)
 const changed=structuredClone(bom);changed.components[0].version='0.0.0';assert.throws(()=>verifyLockedSbom(changed,lock),/IDENTITY_DRIFT/)
 changed.components.pop();assert.throws(()=>verifyLockedSbom(changed,lock),/INVENTORY_DRIFT/)
})
