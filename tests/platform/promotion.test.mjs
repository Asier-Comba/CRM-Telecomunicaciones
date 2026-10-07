import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {promotionGate} from '../../scripts/platform/promotion.mjs'
import {copyEncryptedArchive,retentionPlan} from '../../scripts/platform/destination.mjs'
import {encryptBackup} from '../../scripts/platform/backup.mjs'
test('promotion rejects fabricated/stale acceptance and cannot unlock current hosted runtime',()=>{
 const r=promotionGate({},'PROD')
 for(const e of ['CANDIDATE_SHA_MISMATCH','INDEPENDENT_W4_PROOF_REQUIRED','EXACT_STAGING_PROOF_REQUIRED','BACKUP_FRESHNESS_REQUIRED','CURRENT_HOSTED_RUNTIME_BLOCKED'])assert.ok(r.errors.includes(e))
 assert.equal(r.mutation_performed,false);assert.equal(r.status,'BLOCKED')
})
test('encrypted destination verifies bytes; retention has no automatic deletion',async()=>{
 let stored
 const a=encryptBackup(Buffer.from('synthetic'),randomBytes(32),'test')
 assert.equal((await copyEncryptedArchive(a,{put:async(n,b)=>{stored=b},get:async()=>stored})).status,'PASS')
 await assert.rejects(()=>copyEncryptedArchive(a,{put:async()=>{},get:async()=>Buffer.from('missing')}),/HASH_MISMATCH/)
 await assert.rejects(()=>copyEncryptedArchive(Buffer.from('plain'),{}),/ENCRYPTED_ARCHIVE/)
 const p=retentionPlan([{name:'backup-'+ 'a'.repeat(64)+'.encrypted',created_at:'2020-01-01T00:00:00Z'}],7)
 assert.equal(p.expired.length,1);assert.equal(p.deletion_performed,false);assert.throws(()=>retentionPlan([],0),/APPROVED_RETENTION/)
})
