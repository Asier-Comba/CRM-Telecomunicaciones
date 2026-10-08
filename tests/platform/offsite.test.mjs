import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {encryptBackup,decryptBackup} from '../../scripts/platform/backup.mjs'
import {exerciseOffsite,rotateArchive} from '../../scripts/platform/offsite-contract.mjs'
const policy={approval:'COMPANY_APPROVED',retention_days:30,protection:'IMMUTABILITY',source_account:'source',backup_account:'separate',bucket:'synthetic',region:'synthetic-region'}
function fixture(){const key=randomBytes(32),archive=encryptBackup(Buffer.from('synthetic-only'),key,'key-one'),objects=new Map();let puts=0;const adapter={scope:'DISPOSABLE_SIMULATION',identity:async()=>({account:'separate',bucket:'synthetic',region:'synthetic-region',permissions:{write:true,read:true,delete:false}}),put:async(name,bytes,metadata)=>{puts++;if(!objects.has(name))objects.set(name,{bytes,metadata});const saved=objects.get(name);return {version:'synthetic-version-one',...saved.metadata}},get:async name=>objects.get(name)?.bytes};return {key,archive,adapter,puts:()=>puts}}
test('encrypted separate-account offsite contract proves mock readback without awarding live offsite',async()=>{
 const f=fixture(),now=Date.now();const r=await exerciseOffsite({...f,policy,now});assert.equal(r.status,'SIMULATED_PASS');assert.equal(r.offsite_proven,false);await exerciseOffsite({...f,policy,now});assert.equal(f.puts(),2)
})
test('wrong identity, deletable bucket, retention, region, corruption and interruption fail closed',async()=>{
 for(const change of [f=>f.adapter.scope='HOSTED',f=>f.policy.approval='UNAPPROVED',f=>f.policy.backup_account='source',f=>f.policy.region='wrong',f=>f.adapter.identity=async()=>({account:'separate',bucket:'synthetic',region:'synthetic-region',permissions:{read:true,write:true,delete:true}}),f=>f.adapter.put=async()=>({version:'one',retain_until:0,protection:'IMMUTABILITY'}),f=>f.adapter.get=async()=>Buffer.from('corrupt'),f=>f.adapter.put=async()=>{throw new Error('INTERRUPTED')}]){const f={...fixture(),policy:{...policy}};change(f);await assert.rejects(()=>exerciseOffsite(f))}
})
test('key-version rotation authenticates before reencrypting and retains original decryptability',async()=>{
 const f=fixture(),newKey=randomBytes(32),rotated=await rotateArchive({archive:f.archive,oldKey:f.key,newKey,newKeyId:'key-two',encrypt:encryptBackup});assert.equal(decryptBackup(rotated,newKey).toString(),'synthetic-only');assert.equal(decryptBackup(f.archive,f.key).toString(),'synthetic-only');assert.throws(()=>decryptBackup(rotated,f.key));await assert.rejects(()=>rotateArchive({archive:f.archive,oldKey:randomBytes(32),newKey,newKeyId:'key-two',encrypt:encryptBackup}));await assert.rejects(()=>rotateArchive({archive:f.archive,oldKey:f.key,newKey:f.key,encrypt:encryptBackup}))
})
